import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { isEntity, tableFor, type Row } from '@/lib/content';
import { ContentManager } from '@/components/content-manager';
import { ContentEditor } from '@/components/content-editor';
import { MessageManager } from '@/components/message-manager';
import { MediaManager } from '@/components/media-manager';
export default async function ContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { entity } = await params;
  const { supabase } = await requireAdmin();
  if (entity === 'media') return <MediaManager />;
  if (entity === 'messages') {
    const { data, error, count } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .range(0, 29);
    if (error) throw new Error('Messages could not be loaded.');
    return <MessageManager initialRows={data || []} initialCount={count || 0} />;
  }
  if (!isEntity(entity)) notFound();
  const { data, error, count } = await supabase
    .from(tableFor(entity))
    .select(entity === 'projects' ? '*,project_images(*),project_technologies(name)' : '*', {
      count: 'exact',
    })
    .order('updated_at', { ascending: false })
    .range(0, 29);
  if (error) throw new Error('Content could not be loaded.');
  const rows = (data || []) as unknown as Row[];
  if (entity === 'settings') {
    if (!rows[0]) throw new Error('Apply the database migration first.');
    return (
      <>
        {(await searchParams).saved && (
          <p className="alert success" role="status">
            Settings saved.
          </p>
        )}
        <ContentEditor entity={entity} row={rows[0]} />
      </>
    );
  }
  return (
    <ContentManager
      key={entity}
      entity={entity}
      initialRows={rows}
      initialCount={count || 0}
      saved={(await searchParams).saved === '1'}
    />
  );
}
