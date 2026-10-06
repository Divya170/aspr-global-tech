import { revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';

/**
 * Called by the API after admin edits: drops the cached content so the next page view is fresh.
 * Not public: requires the shared REVALIDATE_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET || '';
  const given = req.headers.get('x-revalidate-secret') || '';
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return new Response('Forbidden', { status: 403 });
  revalidateTag('content');
  return Response.json({ revalidated: true });
}
