// Consistent online backup of the SQLite database (safe while the app is running), plus the
// uploads folder as a .tgz when `tar` is available. Works anywhere Node runs, so it also covers
// hosts without the sqlite3 CLI (e.g. Hostinger's managed Node.js hosting).
//
//   node backend/scripts/backup-db.js [backup-dir]      (default: ~/aspr-backups)
//
// Reads DB_PATH / UPLOAD_DIR from the environment, then ./.env, then backend/.env, like the app.
// Keeps the newest 14 backups of each kind.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
for (const f of [path.join(ROOT, '..', '.env'), path.join(ROOT, '.env')]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !line.trim().startsWith('#') && m[2] !== '' && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const dbPath = path.resolve(ROOT, process.env.DB_PATH || '../database/app.sqlite');
const uploads = path.resolve(ROOT, process.env.UPLOAD_DIR || '../database/uploads');
const outDir = path.resolve(process.argv[2] || path.join(os.homedir(), 'aspr-backups'));
const KEEP = 14;
if (!fs.existsSync(dbPath)) { console.error(`No database at ${dbPath}`); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const dbOut = path.join(outDir, `app-${stamp}.sqlite`);
const Database = require('better-sqlite3');
const db = new Database(dbPath, { readonly: true });
db.backup(dbOut).then(() => {
  db.close();
  console.log(`Database -> ${dbOut}`);
  if (fs.existsSync(uploads)) {
    const tgz = path.join(outDir, `uploads-${stamp}.tgz`);
    try {
      execFileSync('tar', ['-czf', tgz, '-C', path.dirname(uploads), path.basename(uploads)]);
      console.log(`Uploads  -> ${tgz}`);
    } catch {
      console.warn('tar not available: uploads not archived (copy the uploads folder another way).');
    }
  }
  for (const prefix of ['app-', 'uploads-']) {
    const old = fs.readdirSync(outDir).filter((f) => f.startsWith(prefix)).sort().reverse().slice(KEEP);
    for (const f of old) fs.rmSync(path.join(outDir, f));
  }
}).catch((e) => { console.error('Backup failed:', e.message); process.exit(1); });
