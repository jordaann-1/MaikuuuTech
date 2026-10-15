import type { MetadataRoute } from 'next';
import { published, siteUrl } from '@/lib/data';
import { str } from '@/lib/content';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await published('projects');
  return [
    ...[
      '',
      'projects',
      'about',
      'skills',
      'experience',
      'education',
      'certificates',
      'achievements',
      'services',
      'resume',
      'contact',
      'privacy',
    ].map((p) => ({ url: siteUrl(`/${p}`) })),
    ...projects.map((p) => ({
      url: siteUrl(`/projects/${str(p, 'slug')}`),
      lastModified: str(p, 'updated_at'),
    })),
  ];
}
