import 'server-only';
import { cache } from 'react';
import { isConfigured } from './supabase/server';
import { publicClient } from './supabase/public';
import { defaultSettings, type Row } from './content';

// React cache deduplicates within a single request; there is no persistent content cache.
export const getSettings = cache(async (): Promise<Row> => {
  if (!isConfigured()) return defaultSettings;
  const db = publicClient();
  const { data, error } = await db.from('site_settings').select('*').eq('singleton', true).single();
  if (error) throw new Error('Portfolio content is temporarily unavailable.');
  return data;
});
export const published = cache(async (table: string): Promise<Row[]> => {
  if (!isConfigured()) return [];
  const db = publicClient();
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from(table)
      .select('*')
      .eq('is_published', true)
      .order('sort_order')
      .order('created_at', { ascending: false })
      .order('id')
      .range(offset, offset + 999);
    if (error) throw new Error('Portfolio content is temporarily unavailable.');
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
});
export const homeProjects = cache(async (): Promise<Row[]> => {
  if (!isConfigured()) return [];
  const db = publicClient();
  const query = () =>
    db
      .from('projects')
      .select('*,project_technologies(name)')
      .eq('is_published', true)
      .order('sort_order')
      .order('created_at', { ascending: false })
      .limit(4);
  const featured = await query().eq('is_featured', true);
  if (featured.error) throw new Error('Projects are temporarily unavailable.');
  if (featured.data?.length) return featured.data;
  const all = await query();
  if (all.error) throw new Error('Projects are temporarily unavailable.');
  return all.data || [];
});
export const publicProject = cache(async (slug: string): Promise<Row | null> => {
  if (!isConfigured()) return null;
  const db = publicClient();
  const { data, error } = await db
    .from('projects')
    .select('*,project_images(*),project_technologies(name)')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw new Error('Project is temporarily unavailable.');
  return data;
});
export function siteUrl(path = '/') {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').toString();
}
