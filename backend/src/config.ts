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
