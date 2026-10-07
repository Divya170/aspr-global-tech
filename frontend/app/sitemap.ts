import type { MetadataRoute } from 'next';
import { api, ApiUnavailable } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

type Entry = { slug: string; updatedAt: string };
type SitemapData = { services: Entry[]; projects: Entry[]; articles: Entry[]; pages: Entry[] };

const STATIC: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/services', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/portfolio', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/process', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/technologies', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.8, changeFrequency: 'yearly' },
  { path: '/quote', priority: 0.8, changeFrequency: 'yearly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/careers', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/insights', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/privacy-policy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
];

/** SQLite "YYYY-MM-DD HH:MM:SS" (UTC) → Date. */
function toDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(/^\d{4}-\d{2}-\d{2} \d/.test(s) ? `${s.replace(' ', 'T')}Z` : s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let data: SitemapData | null = null;
  try {
    data = await api<SitemapData>('/pages/sitemap', { allow404: true });
  } catch (e) {
    if (!(e instanceof ApiUnavailable)) throw e;
  }

  // Legal pages' lastModified comes from the CMS when available.
  const pageDates = new Map((data?.pages || []).map((p) => [`/${p.slug}`, toDate(p.updatedAt)]));
  const entries: MetadataRoute.Sitemap = STATIC.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`, priority, changeFrequency,
    ...(pageDates.get(path) && { lastModified: pageDates.get(path) }),
  }));

  if (data) {
    const add = (list: Entry[] = [], base: string, priority: number) =>
      list.forEach((x) => entries.push({ url: `${SITE_URL}${base}/${x.slug}`, lastModified: toDate(x.updatedAt), changeFrequency: 'monthly', priority }));
    add(data.services, '/services', 0.8);
    add(data.projects, '/portfolio', 0.7);
    add(data.articles, '/insights', 0.5);
  }
  return entries;
}
