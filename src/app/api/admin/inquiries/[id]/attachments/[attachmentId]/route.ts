import { NextResponse } from 'next/server';
import { adminSession } from '@/lib/auth';
import { HttpError, safeError } from '@/lib/http';
import { inquiryId, privateHeaders } from '@/lib/inquiry-admin';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const session = await adminSession();
    if (!session) throw new HttpError(401, 'Administrator access is required.');
    const ids = await params;
    const id = inquiryId(ids.id),
      attachmentId = inquiryId(ids.attachmentId);
    const { data, error } = await session.supabase
      .from('inquiry_attachments')
      .select('storage_path,original_filename,service_inquiries!inner(submission_state)')
      .eq('id', attachmentId)
      .eq('inquiry_id', id)
      .eq('service_inquiries.submission_state', 'complete')
      .maybeSingle();
    if (error) throw new HttpError(503, 'This attachment is temporarily unavailable.');
    if (!data) throw new HttpError(404, 'Attachment not found.');
    const signed = await session.supabase.storage
      .from('inquiry-attachments')
      .createSignedUrl(data.storage_path, 60, { download: data.original_filename });
    if (signed.error || !signed.data?.signedUrl)
      throw new HttpError(503, 'The download could not be prepared.');
    return NextResponse.redirect(signed.data.signedUrl, {
      status: 303,
      headers: { ...privateHeaders, 'Referrer-Policy': 'no-referrer' },
    });
  } catch (error) {
    return safeError(error);
  }
}
