import type { Metadata } from 'next';
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from './site';

/** Per-page metadata with canonical URL, Open Graph and Twitter cards. */
export function pageMeta({ title, description = DEFAULT_DESCRIPTION, path, image, noindex }: {
  title?: string; description?: string; path: string; image?: string | null; noindex?: boolean;
}): Metadata {
  // Pages without their own image fall back to the generated default card (app/opengraph-image.tsx).
  const images = [{ url: image || '/opengraph-image' }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', url: path, siteName: SITE_NAME, title: title || SITE_NAME, description, images },
    twitter: { card: 'summary_large_image', title: title || SITE_NAME, description, images: images.map((i) => i.url) },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}

/** JSON-LD helper: render with <JsonLd data={…} />. */
export const abs = (p: string) => (p.startsWith('http') ? p : `${SITE_URL}${p}`);
