// Browser-side calls. Everything goes to same-origin /api/*, which Next proxies to the API.

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string> | null;
  constructor(message: string, status: number, body?: { errors?: Record<string, string> }) {
    super(message);
    this.status = status;
    this.fieldErrors = body?.errors || null;
  }
}

export async function request<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const h = new Headers(headers);
  if (json !== undefined) h.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(path, { ...rest, headers: h, body: json !== undefined ? JSON.stringify(json) : rest.body, credentials: 'same-origin', cache: 'no-store' });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0);
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!res.ok) {
    const msg = (data && (Array.isArray(data.message) ? data.message[0] : data.message)) || `Request failed (${res.status})`;
    throw new ApiError(res.status >= 500 ? 'Something went wrong. Please try again.' : msg, res.status, data);
  }
  return data as T;
}

/** Multipart submission: fields as JSON in `data`, files in `files`. */
export function submitForm<T>(path: string, fields: Record<string, unknown>, files: File[] = []): Promise<T> {
  const form = new FormData();
  form.append('data', JSON.stringify(fields));
  files.forEach((f) => form.append('files', f, f.name));
  return request<T>(path, { method: 'POST', body: form });
}
