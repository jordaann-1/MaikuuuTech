import { NextResponse } from 'next/server';
import { adminSession } from '@/lib/auth';
import { assetPath } from '@/lib/content';
import { HttpError, safeError, sameOrigin } from '@/lib/http';
import { detectFile, MAX_UPLOAD } from '@/lib/uploads';

export async function GET() {
  try {
    const session = await adminSession();
    if (!session) throw new HttpError(401, 'Administrator access is required.');
    const { data, error } = await session.supabase.storage
      .from('portfolio')
      .list(session.user.id, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) throw new HttpError(503, 'Media could not be loaded.');
    return NextResponse.json(
      { files: (data || []).map((f) => ({ ...f, path: `${session.user.id}/${f.name}` })) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return safeError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const session = await adminSession();
    if (!session) throw new HttpError(401, 'Administrator access is required.');
    // Requiring Content-Length also bounds multipart parsing before allocation.
    const length = Number(request.headers.get('content-length'));
    if (!length || length > MAX_UPLOAD + 65536)
      throw new HttpError(413, 'Upload a file smaller than 10 MB.');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_UPLOAD)
      throw new HttpError(400, 'Choose a file between 1 byte and 10 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = detectFile(bytes, file.type);
    if (!extension)
      throw new HttpError(
        400,
        'Only genuine JPEG, PNG, WebP images and PDF documents are accepted.',
      );
    const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await session.supabase.storage
      .from('portfolio')
      .upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: '60' });
    if (error)
      throw new HttpError(400, 'Upload failed. Check storage configuration and try again.');
    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const session = await adminSession();
    if (!session) throw new HttpError(401, 'Administrator access is required.');
    const path = assetPath.safeParse(new URL(request.url).searchParams.get('path'));
    if (!path.success) throw new HttpError(400, 'Invalid file path.');
    const { data, error } = await session.supabase.storage.from('portfolio').remove([path.data]);
    if (error || !data?.length)
      throw new HttpError(
        409,
        'The file is still referenced by content, or could not be removed. Remove its content reference first.',
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}
