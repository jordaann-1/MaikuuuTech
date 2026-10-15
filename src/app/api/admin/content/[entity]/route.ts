import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminSession } from '@/lib/auth';
import { isEntity, entitySchema, tableFor, type Entity } from '@/lib/content';
import { databaseError, HttpError, readJson, safeError, sameOrigin } from '@/lib/http';

type Context = { params: Promise<{ entity: string }> };
async function context(ctx: Context) {
  const session = await adminSession();
  if (!session) throw new HttpError(401, 'Administrator access is required.');
  const { entity } = await ctx.params;
  if (!isEntity(entity)) throw new HttpError(404, 'Content type not found.');
  return { ...session, entity };
}
export async function GET(request: Request, ctx: Context) {
  try {
    const { supabase, entity } = await context(ctx);
    const url = new URL(request.url);
    const page = Math.max(0, Math.min(10000, Number(url.searchParams.get('page')) || 0));
    const search = (url.searchParams.get('search') || '').slice(0, 100).replace(/[%_\\]/g, '');
    let query = supabase
      .from(tableFor(entity))
      .select(entity === 'projects' ? '*,project_images(*),project_technologies(name)' : '*', {
        count: 'exact',
      });
    if (search && entity !== 'settings')
      query = query.ilike(
        ['skills', 'skill-categories', 'service-categories'].includes(entity)
          ? 'name'
          : entity === 'social-links' || entity === 'budget-ranges'
            ? 'label'
            : 'title',
        `%${search}%`,
      );
    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(page * 30, page * 30 + 29);
    databaseError(error);
    return NextResponse.json(
      { rows: data, count },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return safeError(error);
  }
}
async function save(request: Request, ctx: Context, update: boolean) {
  try {
    sameOrigin(request);
    const { supabase, entity } = await context(ctx);
    if (entity === 'settings' && !update)
      throw new HttpError(405, 'Edit the existing settings record.');
    const body = z
      .object({ id: update ? z.uuid() : z.undefined().optional(), data: z.unknown() })
      .strict()
      .safeParse(await readJson(request));
    if (!body.success) throw new HttpError(400, 'Invalid record.');
    const parsed = entitySchema(entity).safeParse(body.data.data);
    if (!parsed.success)
      return NextResponse.json(
        {
          error: 'Check the highlighted fields.',
          fields: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 400 },
      );
    if (entity === 'projects') {
      const { data, error } = await supabase.rpc('save_project', {
        p_id: body.data.id || null,
        p_data: parsed.data,
      });
      databaseError(error);
      return NextResponse.json({ id: data });
    }
    const table = supabase.from(tableFor(entity as Entity));
    const result = update
      ? await table.update(parsed.data).eq('id', body.data.id!).select('id').single()
      : await table.insert(parsed.data).select('id').single();
    databaseError(result.error);
    return NextResponse.json(result.data, { status: update ? 200 : 201 });
  } catch (error) {
    return safeError(error);
  }
}
export const POST = (request: Request, ctx: Context) => save(request, ctx, false);
export const PUT = (request: Request, ctx: Context) => save(request, ctx, true);
export async function DELETE(request: Request, ctx: Context) {
  try {
    sameOrigin(request);
    const { supabase, entity } = await context(ctx);
    if (entity === 'settings') throw new HttpError(405, 'Site settings cannot be deleted.');
    const id = z.uuid().safeParse(new URL(request.url).searchParams.get('id'));
    if (!id.success) throw new HttpError(400, 'Invalid record ID.');
    const { error } = await supabase.from(tableFor(entity)).delete().eq('id', id.data);
    databaseError(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}
