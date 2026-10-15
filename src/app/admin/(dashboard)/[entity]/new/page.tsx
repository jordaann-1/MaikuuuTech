import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { isEntity } from '@/lib/content';
import { ContentEditor } from '@/components/content-editor';
export default async function NewContent({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!isEntity(entity) || entity === 'settings') notFound();
  const { supabase } = await requireAdmin();
  const { data, error } =
    entity === 'skills' || entity === 'services'
      ? await supabase
          .from(entity === 'skills' ? 'skill_categories' : 'service_categories')
          .select('*')
          .order('sort_order')
      : { data: [], error: null };
  if (error) throw new Error('Categories could not be loaded.');
  return <ContentEditor entity={entity} categories={data || []} />;
}
