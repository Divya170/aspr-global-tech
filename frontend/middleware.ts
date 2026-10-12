import { NextResponse, type NextRequest } from 'next/server';

const isDev = process.env.NODE_ENV !== 'production';
const PLAUSIBLE = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.tagged-events.js').origin; } catch { return 'https://plausible.io'; }
})();

/**
 * Security headers for every page, including a per-request nonce Content-Security-Policy:
 * only scripts carrying this request's nonce (Next.js's own, JSON-LD, analytics) may run.
 * Next.js reads the nonce from the request's CSP header and applies it to its scripts.
 */
export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const analytics = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? ` ${PLAUSIBLE}` : '';
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `media-src 'self' blob:`,
    `connect-src 'self'${analytics}${isDev ? ' ws:' : ''}`,
    `frame-src https://www.youtube-nocookie.com https://player.vimeo.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (!isDev) res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  if (req.nextUrl.pathname.startsWith('/admin')) {
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

export const config = {
  // Pages only: skip the API proxy, static files, image optimisation and the cache hook.
  matcher: [{ source: '/((?!api|_next/static|_next/image|assets|internal|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)' }],
};
