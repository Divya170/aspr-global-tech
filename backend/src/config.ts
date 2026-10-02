import * as fs from 'fs';
import * as path from 'path';

/** Minimal .env loader (KEY=value lines) so the API has zero config dependencies. */
function loadDotEnv(): void {
  const file = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadDotEnv();

const env = (key: string, fallback: string): string => process.env[key] ?? fallback;

export const config = {
  port: Number(env('PORT', '4000')),
  dbPath: path.resolve(process.cwd(), env('DB_PATH', '../database/app.sqlite')),
  uploadDir: path.resolve(process.cwd(), env('UPLOAD_DIR', '../database/uploads')),
  schemaPath: path.resolve(__dirname, '..', '..', 'database', 'schema.sql'),
  seedPath: path.resolve(__dirname, '..', '..', 'database', 'seed', 'content.json'),
  corsOrigin: env('CORS_ORIGIN', 'http://localhost:3000').split(',').map((s) => s.trim()),
  adminPassword: env('ADMIN_PASSWORD', 'change-me-aspr'),
  adminTokenSecret: env('ADMIN_TOKEN_SECRET', 'dev-only-secret-change-me'),
  adminTokenTtlHours: Number(env('ADMIN_TOKEN_TTL_HOURS', '12')),
  trustProxy: env('TRUST_PROXY', 'false') === 'true',
  // Chat assistant (Google Gemini). Without a key the widget still works and serves knowledge-base fallbacks.
  geminiApiKey: env('GEMINI_API_KEY', ''),
  geminiModel: env('GEMINI_MODEL', 'gemini-2.5-flash'),
  geminiTimeoutMs: Number(env('GEMINI_TIMEOUT_MS', '30000')),
  chatSessionTtlDays: Number(env('CHAT_SESSION_TTL_DAYS', '30')),
  maxFileBytes: 10 * 1024 * 1024,
  maxFiles: 10,
};
