import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { contactSchema } from '@/lib/content';
import { HttpError, readJson, safeError, sameOrigin } from '@/lib/http';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const env = process.env;
    if (
      !env.NEXT_PUBLIC_SUPABASE_URL ||
      !env.SUPABASE_SECRET_KEY ||
      !env.TURNSTILE_SECRET_KEY ||
      !env.CONTACT_HASH_SECRET ||
      env.CONTACT_HASH_SECRET.length < 32
    )
      throw new HttpError(
        503,
        'Messaging is temporarily unavailable. Please use the listed contact links.',
      );
    const parsed = contactSchema.safeParse(await readJson(request, 16384));
    if (!parsed.success)
      throw new HttpError(400, 'Check your fields and complete the verification.');
    const body = parsed.data;
    const ip = request.headers.get('cf-connecting-ip') || 'local-development';
    const form = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: body.token,
      ...(ip !== 'local-development' ? { remoteip: ip } : {}),
    });
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10000),
    });
    if (!verification.ok)
      throw new HttpError(503, 'Verification is unavailable. Please try again.');
    const result = (await verification.json()) as {
      success: boolean;
      hostname?: string;
      action?: string;
    };
    const hostname = new URL(env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').hostname;
    if (
      !result.success ||
      (process.env.NODE_ENV === 'production' &&
        (result.hostname !== hostname || result.action !== 'contact'))
    )
      throw new HttpError(400, 'Verification expired. Please verify again.');
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.CONTACT_HASH_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
    const hash = [...new Uint8Array(signature)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await db.rpc('submit_contact', {
      p_actor_hash: hash,
      p_full_name: body.full_name,
      p_email: body.email,
      p_subject: body.subject,
      p_message: body.message,
    });
    if (error?.code === 'P0001')
      throw new HttpError(429, 'Too many messages. Please try again in an hour.');
    if (error) throw new HttpError(503, 'Your message could not be saved. Please try again later.');
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return safeError(error);
  }
}
