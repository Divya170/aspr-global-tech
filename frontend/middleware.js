import { NextResponse } from 'next/server';

// Unknown /services/<slug> URLs must answer 404, not a "not found" screen with status 200.
// The app-wide loading screen starts streaming before the page can call notFound(), so the
// check happens here. Known slugs are cached for a minute; if the API is down, let the page
// render its own error screen.

const API = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';
const slug = (n) => String(n).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let cache = { at: 0, slugs: null };

async function knownSlugs() {
  if (cache.slugs && Date.now() - cache.at < 60_000) return cache.slugs;
  try {
    const res = await fetch(`${API}/api/content/home`, { cache: 'no-store' });
    if (!res.ok) return cache.slugs;
    cache = { at: Date.now(), slugs: new Set(((await res.json()).services || []).map((s) => slug(s.name))) };
  } catch { /* keep whatever we had */ }
  return cache.slugs;
}

export async function middleware(req) {
  const s = req.nextUrl.pathname.split('/')[2];
  const slugs = await knownSlugs();
  if (slugs && s && !slugs.has(s)) {
    return NextResponse.rewrite(new URL('/_not-found-service', req.url), { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: '/services/:slug' };
