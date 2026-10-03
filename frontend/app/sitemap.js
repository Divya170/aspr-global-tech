const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://asprglobaltech.com';
const API = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';
const slug = (n) => String(n).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const now = new Date();
  let services = [];
  try {
    const res = await fetch(`${API}/api/content/home`, { cache: 'no-store' });
    if (res.ok) services = (await res.json()).services || [];
  } catch { /* sitemap still lists the main pages */ }
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...services.map((s) => ({ url: `${SITE_URL}/services/${slug(s.name)}`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 })),
    { url: `${SITE_URL}/company`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
