import { requireAdmin } from '@/lib/auth';
import { str, type Row } from '@/lib/content';
import { DashboardOverview } from '@/components/dashboard-overview';
export default async function Dashboard() {
  const { supabase, profile } = await requireAdmin();
  const counts = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('is_published', true),
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', false),
    supabase.from('skills').select('id', { count: 'exact', head: true }),
    supabase.from('certificates').select('id', { count: 'exact', head: true }),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
    supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false),
  ]);
  const results = await Promise.all(
    [
      'projects',
      'skills',
      'certificates',
      'experiences',
      'education',
      'achievements',
      'services',
      'site_settings',
      'social_links',
      'resumes',
    ].map(async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(3);
      if (error) throw new Error('Dashboard could not be loaded.');
      return (data || []).map(
        (row) =>
          ({
            ...row,
            entity:
              table === 'site_settings'
                ? 'settings'
                : table === 'experiences'
                  ? 'experience'
                  : table === 'social_links'
                    ? 'social-links'
                    : table === 'resumes'
                      ? 'resume'
                      : table,
          }) as Row,
      );
    }),
  );
  if (counts.some((c) => c.error)) throw new Error('Dashboard could not be loaded.');
  const recent = results
    .flat()
    .sort((a, b) => str(b, 'updated_at').localeCompare(str(a, 'updated_at')))
    .slice(0, 6);
  return (
    <DashboardOverview
      name={profile.display_name}
      counts={counts.map((item) => item.count ?? 0)}
      recent={recent}
    />
  );
}
