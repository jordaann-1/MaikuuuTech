import type { Metadata } from 'next';
import { getSettings, siteUrl } from './data';
import { mediaUrl, str } from './content';
export async function pageMetadata(
  title: string,
  path: string,
  description?: string,
): Promise<Metadata> {
  const settings = await getSettings();
  const name = str(settings, 'site_title');
  const desc = description || str(settings, 'seo_description');
  const image = str(settings, 'og_image');
  return {
    title: { absolute: `${title} | ${name}` },
    description: desc,
    alternates: { canonical: siteUrl(path) },
    openGraph: {
      type: 'website',
      title: `${title} | ${name}`,
      description: desc,
      url: siteUrl(path),
      siteName: name,
      ...(image ? { images: [{ url: siteUrl(mediaUrl(image)), width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${title} | ${name}`,
      description: desc,
      ...(image ? { images: [siteUrl(mediaUrl(image))] } : {}),
    },
  };
}
