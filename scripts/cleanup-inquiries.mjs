import { createClient } from '@supabase/supabase-js';
try {
  process.loadEnvFile('.env.local');
} catch {
  /* Environment variables may be provided directly. */
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('BLOCKED: Supabase URL and server secret are required.');
  process.exitCode = 2;
} else {
  const apply = process.argv.includes('--apply'),
    db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    cutoff = new Date(Date.now() - 86400000).toISOString();
  const { data, error } = await db
    .from('service_inquiries')
    .select('id')
    .eq('submission_state', 'uploading')
    .lt('created_at', cutoff)
    .order('created_at')
    .limit(100);
  if (error) throw new Error('Pending inquiry cleanup could not be loaded.');
  console.log(
    (apply ? 'APPLY' : 'DRY RUN') +
      ': ' +
      data.length +
      ' stale pending inquiries (older than 24 hours; batch limit 100).',
  );
  for (const row of data) {
    const files = await db.storage.from('inquiry-attachments').list(row.id, { limit: 100 });
    if (files.error) throw new Error('Storage listing failed; pending record retained.');
    if (files.data.length >= 100)
      throw new Error('Unexpected folder size; manual review required.');
    if (!apply) continue;
    if (files.data.length) {
      const removed = await db.storage
        .from('inquiry-attachments')
        .remove(files.data.map((file) => row.id + '/' + file.name));
      if (removed.error) throw new Error('Storage cleanup failed; pending record retained.');
    }
    const removed = await db
      .from('service_inquiries')
      .delete()
      .eq('id', row.id)
      .eq('submission_state', 'uploading')
      .lt('created_at', cutoff);
    if (removed.error) throw new Error('Pending record cleanup failed.');
  }
  console.log(
    apply ? 'Cleanup completed.' : 'No changes made. Review the count before running with --apply.',
  );
}
