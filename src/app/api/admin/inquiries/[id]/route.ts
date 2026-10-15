import { NextResponse } from 'next/server';
import { adminSession } from '@/lib/auth';
import { HttpError, safeError, sameOrigin, readJson } from '@/lib/http';
import { inquiryPatchSchema } from '@/lib/inquiries';
import { inquiryDetail, inquiryId, privateHeaders } from '@/lib/inquiry-admin';
type Context = { params: Promise<{ id: string }> };
async function authorized(context: Context) {
  const session = await adminSession();
  if (!session) throw new HttpError(401, 'Administrator access is required.');
  return { ...session, id: inquiryId((await context.params).id) };
}
export async function GET(_request: Request, context: Context) {
  try {
    const { supabase, id } = await authorized(context);
    return NextResponse.json(await inquiryDetail(supabase, id), { headers: privateHeaders });
  } catch (error) {
    return safeError(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const { supabase, id } = await authorized(context);
    const parsed = inquiryPatchSchema.safeParse(await readJson(request, 65536));
    if (!parsed.success) throw new HttpError(400, 'Invalid inquiry update.');
    const { data, error } = await supabase
      .from('service_inquiries')
      .update(parsed.data)
      .eq('id', id)
      .eq('submission_state', 'complete')
      .select('id')
      .maybeSingle();
    if (error) throw new HttpError(503, 'The change could not be saved. Please try again.');
    if (!data) throw new HttpError(404, 'Inquiry not found.');
    return NextResponse.json(await inquiryDetail(supabase, id), { headers: privateHeaders });
  } catch (error) {
    return safeError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const { supabase, id } = await authorized(context);
    const row = await inquiryDetail(supabase, id);
    const paths = row.inquiry_attachments.map(
      (file: { id: string; storage_path?: string }) => file.id,
    );
    if (paths.length) {
      const files = await supabase
        .from('inquiry_attachments')
        .select('storage_path')
        .eq('inquiry_id', id);
      if (files.error) throw new HttpError(503, 'Attachment cleanup could not be prepared.');
      const removed = await supabase.storage
        .from('inquiry-attachments')
        .remove((files.data || []).map((file) => file.storage_path));
      if (removed.error)
        throw new HttpError(
          503,
          'Attachments could not be removed. The inquiry has been kept; try again.',
        );
    }
    const { error } = await supabase.from('service_inquiries').delete().eq('id', id);
    if (error) throw new HttpError(503, 'Inquiry could not be deleted. Please try again.');
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return safeError(error);
  }
}
