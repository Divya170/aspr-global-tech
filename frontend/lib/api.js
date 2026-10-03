// Thin API client. In the browser every call goes to the same-origin `/api/*`
// path, which next.config.mjs proxies to the NestJS backend (no CORS, one origin).
// On the server (page data loading) we call the backend directly.

const SERVER_BASE = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body || {};
    this.fieldErrors = (body && body.errors) || null;
  }
}

function base() {
  return typeof window === 'undefined' ? SERVER_BASE : '';
}

export async function request(path, { method = 'GET', body, token, form, signal, cache } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form; // FormData — browser sets the multipart boundary
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try {
    res = await fetch(base() + path, { method, headers, body: payload, signal, cache: cache || 'no-store' });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!res.ok) {
    const msg = (data && (Array.isArray(data.message) ? data.message[0] : data.message)) || `Request failed (${res.status})`;
    throw new ApiError(res.status >= 500 ? 'Something went wrong on our side. Please try again in a minute.' : msg, res.status, data);
  }
  return data;
}

// ── public site ──
export const getHomeContent = () => request('/api/content/home');
export const getCompanyContent = () => request('/api/content/company');

export function submitEnquiry(fields, files) {
  const form = new FormData();
  form.append('data', JSON.stringify(fields));
  files.forEach((f) => form.append('files', f, f.name));
  return request('/api/enquiries', { method: 'POST', form });
}

export function submitApplication(roleId, fields, files) {
  const form = new FormData();
  form.append('data', JSON.stringify(fields));
  files.forEach((f) => form.append('files', f, f.name));
  return request(`/api/roles/${roleId}/applications`, { method: 'POST', form });
}

export const subscribe = (email, source) => request('/api/newsletter/subscribe', { method: 'POST', body: { email, source } });

// ── admin ──
export const admin = {
  login: (password) => request('/api/admin/auth/login', { method: 'POST', body: { password } }),
  me: (token) => request('/api/admin/auth/me', { token }),
  stats: (token) => request('/api/admin/stats', { token }),
  list: (token, resource, params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return request(`/api/admin/${resource}${q ? '?' + q : ''}`, { token });
  },
  get: (token, resource, id) => request(`/api/admin/${resource}/${id}`, { token }),
  create: (token, resource, body) => request(`/api/admin/${resource}`, { method: 'POST', body, token }),
  update: (token, resource, id, body) => request(`/api/admin/${resource}/${id}`, { method: 'PATCH', body, token }),
  remove: (token, resource, id) => request(`/api/admin/${resource}/${id}`, { method: 'DELETE', token }),
  schema: (token) => request('/api/admin/content/schema', { token }),
  settings: (token) => request('/api/admin/settings', { token }),
  saveSetting: (token, key, value) => request(`/api/admin/settings/${key}`, { method: 'PUT', body: { value }, token }),
  // file download / CSV export need the auth header, so we fetch a blob
  async download(token, path, filename) {
    const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new ApiError('Download failed', res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
