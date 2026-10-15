import { NextResponse } from 'next/server';
import { assetPath } from '@/lib/content';
import { createClient, isConfigured } from '@/lib/supabase/server';

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!isConfigured()) return new NextResponse('Not found', { status: 404 });
  const path = assetPath.safeParse((await ctx.params).path.join('/'));
  if (!path.success) return new NextResponse('Not found', { status: 404 });
  const db = await createClient();
  const download = new URL(request.url).searchParams.has('download');
  const { data, error } = await db.storage
    .from('portfolio')
    .createSignedUrl(
      path.data,
      60,
      download
        ? { download: `MaikuuuTech-${path.data.endsWith('.pdf') ? 'document.pdf' : 'image'}` }
        : undefined,
    );
  if (error || !data)
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  return NextResponse.redirect(data.signedUrl, {
    status: 307,
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
  });
}
