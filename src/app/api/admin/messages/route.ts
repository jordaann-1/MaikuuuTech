import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminSession } from '@/lib/auth';
import { databaseError, HttpError, readJson, safeError, sameOrigin } from '@/lib/http';

export async function GET(request: Request) {
  try {
    const session = await adminSession();
    if (!session) throw new HttpError(401, 'Administrator access is required.');
    const params = new URL(request.url).searchParams;
    const page = Math.max(0, Math.min(10000, Math.floor(Number(params.get('page')) || 0)));
    let query = session.supabase
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (params.get('filter') === 'unread')
      query = query.eq('is_read', false).eq('is_archived', false);
    else if (params.get('filter') === 'archived') query = query.eq('is_archived', true);
    else if (params.get('filter') !== 'all') query = query.eq('is_archived', false);
    const { data, error, count } = await query.range(page * 30, page * 30 + 29);
    databaseError(error);
    return NextResponse.json(
      { rows: data, count },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return safeError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const session = await adminSession();
    if (!session) throw new HttpError(401, 'Administrator access is required.');
    const parsed = z
      .object({
        id: z.uuid(),
        is_read: z.boolean().optional(),
        is_archived: z.boolean().optional(),
      })
      .strict()
      .safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, 'Invalid message update.');
    const { id, ...data } = parsed.data;
    const { error } = await session.supabase.from('contact_messages').update(data).eq('id', id);
    databaseError(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const session = await adminSession();
    if (!session) throw new HttpError(401, 'Administrator access is required.');
    const id = z.uuid().safeParse(new URL(request.url).searchParams.get('id'));
    if (!id.success) throw new HttpError(400, 'Invalid message ID.');
    const { error } = await session.supabase.from('contact_messages').delete().eq('id', id.data);
    databaseError(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}
