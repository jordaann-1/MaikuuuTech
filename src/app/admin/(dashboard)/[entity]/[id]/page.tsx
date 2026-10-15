import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { isEntity, tableFor, type Row } from '@/lib/content';
import { ContentEditor } from '@/components/content-editor';
export default async function EditContent({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (!isEntity(entity) || !z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireAdmin();
  const [result, categories] = await Promise.all([
    supabase
      .from(tableFor(entity))
      .select(entity === 'projects' ? '*,project_images(*),project_technologies(name)' : '*')
      .eq('id', id)
      .maybeSingle(),
    entity === 'skills' || entity === 'services'
      ? supabase
          .from(entity === 'skills' ? 'skill_categories' : 'service_categories')
          .select('*')
          .order('sort_order')
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (result.error || categories.error) throw new Error('Content could not be loaded.');
  if (!result.data) notFound();
  return (
    <ContentEditor
      key={id}
      entity={entity}
      row={result.data as unknown as Row}
      categories={categories.data || []}
    />
  );
}
