import * as fs from 'fs';
import * as path from 'path';

/** backend/, whether running from src (ts) or dist (js). Relative paths resolve from here, not the cwd. */
const BACKEND_DIR = path.resolve(__dirname, '..');

/**
 * Minimal .env loader (KEY=value lines) so the API has zero config dependencies.
 * Real environment variables win, then the project-root .env, then backend/.env.
 */
export function loadDotEnv(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadDotEnv(path.resolve(BACKEND_DIR, '..', '.env'));
loadDotEnv(path.resolve(BACKEND_DIR, '.env'));

const env = (key: string, fallback: string): string => process.env[key] ?? fallback;
const isProd = process.env.NODE_ENV === 'production';

export const config = {
  // API_PORT is used when the API runs inside server.js, where PORT belongs to the website.
  port: Number(env('API_PORT', env('PORT', '4000'))),
  // Bind address. server.js passes 127.0.0.1 so the API is only reachable through the website.
  host: env('API_HOST', ''),
  dbPath: path.resolve(BACKEND_DIR, env('DB_PATH', '../database/app.sqlite')),
  uploadDir: path.resolve(BACKEND_DIR, env('UPLOAD_DIR', '../database/uploads')),
  schemaPath: path.resolve(__dirname, '..', '..', 'database', 'schema.sql'),
  seedPath: path.resolve(__dirname, '..', '..', 'database', 'seed', 'content.json'),
  corsOrigin: env('CORS_ORIGIN', 'http://localhost:3000').split(',').map((s) => s.trim()),
  isProd,
  // Public URL of the site, used in emails and links.
  siteUrl: env('SITE_URL', env('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')).replace(/\/$/, ''),
  // The first super admin is created from these on first boot (when there are no users yet).
  adminEmail: env('ADMIN_EMAIL', 'support@asprglobaltech.com'),
  adminName: env('ADMIN_NAME', 'ASPR Admin'),
  adminPassword: env('ADMIN_PASSWORD', 'change-me-aspr'),
  sessionTtlHours: Number(env('ADMIN_SESSION_TTL_HOURS', env('ADMIN_TOKEN_TTL_HOURS', '12'))),
  // Secure cookies need HTTPS; set COOKIE_SECURE=false only to test a production build over plain http.
  cookieSecure: env('COOKIE_SECURE', isProd ? 'true' : 'false') === 'true',
  trustProxy: env('TRUST_PROXY', 'false') === 'true',
  // Transactional email (SMTP). Without SMTP_HOST emails are recorded in the outbox as "skipped".
  smtp: {
    host: env('SMTP_HOST', ''),
    port: Number(env('SMTP_PORT', '465')),
    secure: env('SMTP_SECURE', env('SMTP_PORT', '465') === '465' ? 'true' : 'false') === 'true',
    user: env('SMTP_USER', ''),
    pass: env('SMTP_PASS', ''),
  },
  mailFrom: env('MAIL_FROM', 'ASPR Global Tech <support@asprglobaltech.com>'),
  // Where new-lead notifications go (comma-separated). Defaults to the company email in Settings.
  leadsNotifyTo: env('LEADS_NOTIFY_TO', ''),
  // The website's cache is cleared after admin edits by calling WEB_INTERNAL_URL/internal/revalidate.
  webInternalUrl: env('WEB_INTERNAL_URL', 'http://127.0.0.1:3000'),
  revalidateSecret: env('REVALIDATE_SECRET', ''),
  // Chat assistant (Google Gemini). Without a key the widget still works and serves knowledge-base fallbacks.
  geminiApiKey: env('GEMINI_API_KEY', ''),
  geminiModel: env('GEMINI_MODEL', 'gemini-2.5-flash'),
  geminiTimeoutMs: Number(env('GEMINI_TIMEOUT_MS', '30000')),
  chatSessionTtlDays: Number(env('CHAT_SESSION_TTL_DAYS', '30')),
  maxFileBytes: 10 * 1024 * 1024,
  maxFiles: 5,
  maxImageBytes: 8 * 1024 * 1024,
  maxVideoBytes: 60 * 1024 * 1024,
};
