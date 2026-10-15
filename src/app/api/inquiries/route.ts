import { NextResponse } from 'next/server';
import { z } from 'zod';
import { inquirySchema, MAX_ATTACHMENTS } from '@/lib/inquiries';
import { attachmentExtension, safeAttachmentName } from '@/lib/inquiry-files';
import {
  hex,
  inquiryActor,
  inquiryServiceClient,
  readInquiryMultipart,
  verifyInquiryBot,
} from '@/lib/inquiry-server';
import { HttpError, safeError, sameOrigin } from '@/lib/http';
export async function POST(request: Request) {
  const uploaded: string[] = [];
  let reservationId: string | undefined;
  let persisted = false;
  let db: ReturnType<typeof inquiryServiceClient> | undefined;
  try {
    sameOrigin(request);
    db = inquiryServiceClient();
    const form = await readInquiryMultipart(request);
    if ([...form.keys()].some((key) => !['data', 'attachments'].includes(key)))
      throw new HttpError(400, 'Unexpected form fields.');
    const raw = form.get('data');
    if (typeof raw !== 'string' || raw.length > 32768)
      throw new HttpError(400, 'The inquiry details are too large.');
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'Invalid inquiry details.');
    }
    const parsed = inquirySchema.safeParse(json);
    if (!parsed.success)
      return NextResponse.json(
        {
          error: 'Please check the highlighted fields.',
          fields: Object.fromEntries(
            Object.entries(z.flattenError(parsed.error).fieldErrors).map(([key, messages]) => [
              key,
              messages?.[0] || 'Check this field.',
            ]),
          ),
        },
        { status: 400 },
      );
    const files = form.getAll('attachments');
    if (files.length > MAX_ATTACHMENTS) throw new HttpError(400, 'Attach no more than 3 files.');
    const prepared = [];
    for (const file of files) {
      if (!(file instanceof File)) throw new HttpError(400, 'Invalid attachment.');
      const bytes = new Uint8Array(await file.arrayBuffer()),
        extension = attachmentExtension(bytes, file.type);
      if (!extension)
        throw new HttpError(
          400,
          'An attachment is invalid or too large. Use PDF, JPEG, PNG, WebP, TXT, or DOCX up to 5 MB (TXT up to 1 MB).',
        );
      prepared.push({
        bytes,
        extension,
        name: safeAttachmentName(file.name, extension),
        mime: file.type,
        size: file.size,
        sha: hex(await crypto.subtle.digest('SHA-256', bytes)),
      });
    }
    const { token, website: honeypot, ...payload } = parsed.data;
    void honeypot;
    const fingerprint = hex(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(
          JSON.stringify({
            payload,
            files: prepared.map((file) => ({
              name: file.name,
              mime: file.mime,
              size: file.size,
              sha: file.sha,
            })),
          }),
        ),
      ),
    );
    const actor = await inquiryActor(request);
    const duplicate = await db
      .from('service_inquiries')
      .select('public_reference,submission_state')
      .eq('submission_id', payload.submission_id)
      .eq('request_fingerprint', fingerprint)
      .eq('actor_hash', actor)
      .maybeSingle();
    if (duplicate.error)
      throw new HttpError(503, 'Your inquiry could not be checked. Please try again.');
    if (duplicate.data?.submission_state === 'complete')
      return NextResponse.json(
        { reference: duplicate.data.public_reference, duplicate: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    await verifyInquiryBot(request, token);
    const reference = 'MKT-' + crypto.randomUUID().replace(/-/g, '').toUpperCase();
    const reserved = await db.rpc('reserve_inquiry', {
      p_submission_id: payload.submission_id,
      p_reference: reference,
      p_fingerprint: fingerprint,
      p_actor_hash: actor,
      p_data: payload,
    });
    if (reserved.error?.code === 'P0001')
      throw new HttpError(429, 'Too many requests. Please try again in an hour.');
    if (reserved.error?.code === '22023')
      throw new HttpError(
        400,
        'The selected service, budget, or deadline is no longer available. Refresh the catalog and check your details.',
      );
    if (reserved.error?.code === '23505')
      throw new HttpError(
        409,
        'This request is already being processed. Please wait and retry with the same details.',
      );
    if (reserved.error || !reserved.data)
      throw new HttpError(503, 'The inquiry could not be saved. Please try again.');
    const reservation = reserved.data as {
      id: string;
      reference: string;
      state: string;
      existing: boolean;
    };
    if (reservation.existing) {
      if (reservation.state === 'complete')
        return NextResponse.json({ reference: reservation.reference, duplicate: true });
      throw new HttpError(
        409,
        'This request is still being processed. Please wait before retrying.',
      );
    }
    reservationId = reservation.id;
    const attachments = [];
    for (const file of prepared) {
      const path = reservation.id + '/' + crypto.randomUUID() + '.' + file.extension;
      // Include attempted paths in compensation even if the upload response is lost.
      uploaded.push(path);
      const result = await db.storage
        .from('inquiry-attachments')
        .upload(path, file.bytes, { contentType: file.mime, upsert: false, cacheControl: '0' });
      if (result.error)
        throw new HttpError(
          503,
          'An attachment could not be uploaded. Your entered details have been kept; please try again.',
        );
      attachments.push({
        storage_path: path,
        original_filename: file.name,
        mime_type: file.mime,
        file_size: file.size,
      });
    }
    const completed = await db.rpc('complete_inquiry', {
      p_id: reservation.id,
      p_attachments: attachments,
    });
    if (completed.error) {
      const check = await db
        .from('service_inquiries')
        .select('submission_state')
        .eq('id', reservation.id)
        .maybeSingle();
      if (check.data?.submission_state === 'complete') {
        persisted = true;
        return NextResponse.json({ reference: reservation.reference });
      }
      throw new HttpError(
        503,
        'Your inquiry could not be finalized. Please retry with the same details.',
      );
    }
    persisted = true;
    return NextResponse.json(
      { reference: reservation.reference },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return safeError(error);
  } finally {
    if (db && reservationId && !persisted) {
      // Failed requests do not intentionally retain documents. Stale crash leftovers have a cleanup command.
      try {
        const row = await db
          .from('service_inquiries')
          .select('submission_state')
          .eq('id', reservationId)
          .maybeSingle();
        if (row.data?.submission_state === 'uploading') {
          const removed = uploaded.length
            ? await db.storage.from('inquiry-attachments').remove(uploaded)
            : { error: null };
          if (!removed.error)
            await db
              .from('service_inquiries')
              .delete()
              .eq('id', reservationId)
              .eq('submission_state', 'uploading');
        }
      } catch {
        /* Leave pending rows for the documented cleanup job rather than lose the storage reference. */
      }
    }
  }
}
