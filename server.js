// Production entry point: runs the NestJS API and the Next.js website in one Node process.
//
// Hosts such as Hostinger's Node.js Web Apps start a single app on the port they give it
// in PORT. The website listens on that port; the API listens on 127.0.0.1:API_PORT, which
// is private to the server, and the website reaches it through its /api/* proxy.
//
//   npm run build && npm start
//
// Configuration comes from real environment variables, then ./.env, then backend/.env.

const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = __dirname;
const FRONTEND = path.join(ROOT, 'frontend');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Load ./.env before reading any setting (real environment variables win).
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const WEB_PORT = Number(process.env.PORT || 3000);
const WEB_HOST = process.env.HOST || '0.0.0.0';
// Fixed before the backend loads, so backend/.env's PORT cannot claim the website's port.
process.env.API_PORT = process.env.API_PORT || '4000';
process.env.API_HOST = process.env.API_HOST || '127.0.0.1';
process.env.API_INTERNAL_URL = process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.API_PORT}`;

for (const [file, hint] of [
  [path.join(ROOT, 'backend', 'dist', 'main.js'), 'backend'],
  [path.join(FRONTEND, '.next', 'BUILD_ID'), 'frontend'],
]) {
  if (!fs.existsSync(file)) {
    console.error(`The ${hint} has not been built. Run "npm run build" first.`);
    process.exit(1);
  }
}

async function main() {
  const { bootstrap } = require('./backend/dist/main');
  const api = await bootstrap({ shutdownHooks: false });

  // Resolve Next.js from frontend/node_modules; the root package does not depend on it.
  const next = require(require.resolve('next', { paths: [FRONTEND] }));
  const web = next({ dev: false, dir: FRONTEND, hostname: WEB_HOST, port: WEB_PORT });
  await web.prepare();
  const handle = web.getRequestHandler();

  const server = http.createServer((req, res) => handle(req, res));
  server.listen(WEB_PORT, WEB_HOST, () => {
    console.log(`ASPR website listening on http://${WEB_HOST}:${WEB_PORT} (API on ${process.env.API_INTERNAL_URL})`);
  });

  // Let the host restart or redeploy without cutting requests mid-way or leaving SQLite open.
  let stopping = false;
  const shutdown = (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`${signal} received, shutting down…`);
    const force = setTimeout(() => process.exit(0), 10_000);
    force.unref();
    server.close(async () => {
      await api.close().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
