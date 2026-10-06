// Creates a super admin, or resets an existing account's password and unlocks it.
// For recovery when nobody can sign in (e.g. email is not configured yet).
//
//   npm run admin:create -- someone@example.com "Their Name"
//
// A strong random password is generated and printed once. Run with the same DB_PATH as the app.
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
for (const f of [path.join(ROOT, '..', '.env'), path.join(ROOT, '.env')]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const [email, name = 'Admin'] = process.argv.slice(2);
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
  console.error('Usage: npm run admin:create -- email@example.com "Full Name"');
  process.exit(1);
}
const dbPath = path.resolve(ROOT, process.env.DB_PATH || '../database/app.sqlite');
if (!fs.existsSync(dbPath)) {
  console.error(`No database at ${dbPath}. Start the app once first (it creates and migrates the database).`);
  process.exit(1);
}

const password = crypto.randomBytes(15).toString('base64url');
const N = 65536, r = 8, p = 1;
const salt = crypto.randomBytes(16);
const key = crypto.scryptSync(password, salt, 64, { N, r, p, maxmem: 256 * 1024 * 1024 });
const hash = ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');

const Database = require('better-sqlite3');
const db = new Database(dbPath);
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
if (existing) {
  db.prepare("UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL, status = 'active', password_changed_at = datetime('now') WHERE id = ?").run(hash, existing.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  console.log(`Reset the password for ${email} and unlocked the account.`);
} else {
  db.prepare("INSERT INTO users (email, name, password_hash, role, password_changed_at) VALUES (?, ?, ?, 'super_admin', datetime('now'))").run(email.toLowerCase(), name, hash);
  console.log(`Created super admin ${email}.`);
}
db.close();
console.log(`Temporary password: ${password}\nSign in at /admin and change it under Account.`);
