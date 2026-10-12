import 'server-only';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

/**
 * Server-side reads from the NestJS API. Responses are kept in Next's data cache for five
 * minutes under the "content" tag; the API clears that tag after every admin edit
 * (POST /internal/revalidate), so changes show on the next page load.
 */
const API = process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.API_PORT || 4000}`;

export class ApiUnavailable extends Error {}

export async function api<T>(path: string, { allow404 = false } = {}): Promise<T> {
  // Content pages render per request (the data itself is cached), never at build time when
  // the API isn't running.
  await connection();
  let res: Response;
  try {
    res = await fetch(`${API}/api${path}`, { next: { revalidate: 300, tags: ['content'] } });
  } catch {
    throw new ApiUnavailable(`API unreachable: ${path}`);
  }
  if (res.status === 404 && !allow404) notFound();
  if (!res.ok) throw new ApiUnavailable(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}
