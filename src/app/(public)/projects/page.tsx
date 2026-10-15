import Link from 'next/link';
import { Search } from 'lucide-react';
import { publicClient } from '@/lib/supabase/public';
import { isConfigured } from '@/lib/supabase/server';
import { type Row } from '@/lib/content';
import { EmptyState, ProjectCard } from '@/components/public';
import { pageMetadata } from '@/lib/metadata';
export const generateMetadata = () => pageMetadata('Projects', '/projects');
export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q || '').slice(0, 100).replace(/[%_\\]/g, '');
  const category = (params.category || '').slice(0, 100);
  const page = Math.max(1, Math.min(100000, Math.floor(Number(params.page) || 1)));
  let projects: Row[] = [],
    count = 0,
    categories: string[] = [];
  if (isConfigured()) {
    const db = publicClient();
    let query = db
      .from('projects')
      .select('*,project_technologies(name)', { count: 'exact' })
      .eq('is_published', true);
    if (q) query = query.ilike('title', `%${q}%`);
    if (category) query = query.eq('category', category);
    const [result, cats] = await Promise.all([
      query
        .order('sort_order')
        .order('created_at', { ascending: false })
        .range((page - 1) * 12, page * 12 - 1),
      db.rpc('project_categories'),
    ]);
    if (result.error || cats.error) throw new Error('Projects could not be loaded.');
    projects = result.data || [];
    count = result.count || 0;
    categories = [
      ...new Set<string>((cats.data || []).map((c: { category: string }) => c.category)),
    ].sort();
  }
  const pageHref = (n: number) =>
    `/projects?${new URLSearchParams({ q, category, page: String(n) })}`;
  return (
    <div className="container page-content">
      <div className="page-heading">
        <div className="eyebrow">A COLLECTION OF EXPLORATIONS</div>
        <h1>
          Built with intention<span className="accent">.</span>
        </h1>
        <p>Projects, experiments, and the problems behind them.</p>
      </div>
      <form className="filter-bar" action="/projects">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Search projects by title</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search projects…"
            maxLength={100}
          />
        </label>
        <label className="filter-select">
          <span className="sr-only">Project category</span>
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button className="button secondary" type="submit">
          Apply filters
        </button>
      </form>
      <div className="listing-caption">
        <span>
          {count} {count === 1 ? 'project' : 'projects'}
        </span>
        {(q || category) && (
          <Link className="text-link" href="/projects">
            Clear filters
          </Link>
        )}
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={q || category ? 'No matching projects.' : 'Work in progress. Stories to come.'}
          description={
            q || category
              ? 'Try a different search or category.'
              : 'Published projects will appear here, with a closer look at how they were built.'
          }
        />
      )}
      <nav className="pagination" aria-label="Project pages">
        {page > 1 && (
          <Link className="button secondary" href={pageHref(page - 1)}>
            Previous
          </Link>
        )}
        {page * 12 < count && (
          <Link className="button secondary" href={pageHref(page + 1)}>
            Next page
          </Link>
        )}
      </nav>
    </div>
  );
}
