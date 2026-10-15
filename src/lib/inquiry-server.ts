import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from './http';
import { MAX_INQUIRY_BODY, type InquiryFilters } from './inquiries';
export function inquiryServiceClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT') ||
    !process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET_KEY.startsWith('YOUR_') ||
    !process.env.CONTACT_HASH_SECRET ||
    process.env.CONTACT_HASH_SECRET.length < 32 ||
    !process.env.TURNSTILE_SECRET_KEY ||
    process.env.TURNSTILE_SECRET_KEY.startsWith('YOUR_')
  )
    throw new HttpError(
      503,
      'Project inquiries are temporarily unavailable. Please use the listed contact links.',
    );
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(30000), cache: 'no-store' }),
    },
  });
}
export async function readInquiryMultipart(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data;'))
    throw new HttpError(415, 'Use the inquiry form to submit your request.');
  if (Number(request.headers.get('content-length')) > MAX_INQUIRY_BODY)
    throw new HttpError(413, 'Your attachments are too large. Use up to 3 files, 5 MB each.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A request body is required.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > MAX_INQUIRY_BODY) {
      await reader.cancel();
      throw new HttpError(413, 'Your attachments are too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return await new Response(bytes, { headers: { 'content-type': contentType } }).formData();
  } catch {
    throw new HttpError(400, 'The form could not be read. Please try again.');
  }
}
export async function inquiryActor(request: Request) {
  const ip = request.headers.get('cf-connecting-ip') || 'local-development';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(process.env.CONTACT_HASH_SECRET!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip)));
}
export const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
export async function verifyInquiryBot(request: Request, token: string) {
  if (!token) throw new HttpError(400, 'Complete the spam verification before submitting.');
  const ip = request.headers.get('cf-connecting-ip');
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!,
    response: token,
    ...(ip ? { remoteip: ip } : {}),
  });
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(503, 'Verification is unavailable. Please try again.');
  const result = (await response.json()) as {
    success: boolean;
    hostname?: string;
    action?: string;
  };
  const host = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').hostname;
  if (
    !result.success ||
    (process.env.NODE_ENV === 'production' &&
      (result.hostname !== host || result.action !== 'inquiry'))
  )
    throw new HttpError(400, 'Verification expired. Please verify again.');
}
export async function queryInquiries(db: SupabaseClient, filters: InquiryFilters) {
  let query = db
    .from('service_inquiries')
    .select(
      'id,public_reference,full_name,email,service_id,service_name_snapshot,project_title,budget_range,preferred_deadline,urgency,status,priority,is_read,is_archived,created_at,updated_at',
      { count: 'exact' },
    )
    .eq('submission_state', 'complete');
  const search = filters.search.replace(/[,%_()"\\]/g, ' ').trim();
  if (search)
    query = query.or(
      ['full_name', 'email', 'project_title', 'public_reference']
        .map((field) => field + '.ilike.%' + search + '%')
        .join(','),
    );
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.service) query = query.eq('service_id', filters.service);
  if (filters.archive !== 'all') query = query.eq('is_archived', filters.archive === 'archived');
  if (filters.from) query = query.gte('created_at', filters.from + 'T00:00:00+08:00');
  if (filters.to) query = query.lte('created_at', filters.to + 'T23:59:59.999+08:00');
  const { data, error, count } = await query
    .order('created_at', { ascending: filters.sort === 'oldest' })
    .order('id')
    .range(filters.page * 20, filters.page * 20 + 19);
  if (error) throw new HttpError(503, 'Inquiries could not be loaded. Please try again.');
  return { rows: data || [], count: count || 0 };
}
