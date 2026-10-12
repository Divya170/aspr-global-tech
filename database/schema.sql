-- ASPR Global Tech: v1 baseline schema. The backend applies it to new databases and to ones
-- that predate the migration runner; every later change lives in backend/src/database/migrations/.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- ───────────── Content ─────────────
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  num TEXT NOT NULL, name TEXT NOT NULL, pillar TEXT NOT NULL CHECK (pillar IN ('Build','Brand','Grow')),
  line TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT 'language',
  img TEXT, alt TEXT NOT NULL DEFAULT '', pos TEXT NOT NULL DEFAULT 'center',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, tag TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT 'apps',
  img TEXT, alt TEXT NOT NULL DEFAULT '', pos TEXT NOT NULL DEFAULT 'center',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS industries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, problem TEXT NOT NULL DEFAULT '', builds TEXT NOT NULL DEFAULT '[]',
  img TEXT, alt TEXT NOT NULL DEFAULT '', pos TEXT NOT NULL DEFAULT 'center',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS work_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client TEXT NOT NULL, pillar TEXT NOT NULL CHECK (pillar IN ('Build','Brand','Grow')), scope TEXT NOT NULL DEFAULT '[]',
  outcome TEXT NOT NULL DEFAULT '', img TEXT, alt TEXT NOT NULL DEFAULT '', pos TEXT NOT NULL DEFAULT 'center',
  featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS process_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  num TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', outputs TEXT NOT NULL DEFAULT '[]',
  stage INTEGER NOT NULL CHECK (stage IN (1,2,3)), sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '[]', description TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Build','Brand','Grow','Process','Studio')),
  img TEXT, alt TEXT NOT NULL DEFAULT '', pos TEXT NOT NULL DEFAULT 'center', author TEXT NOT NULL DEFAULT '', published_at TEXT NOT NULL DEFAULT '',
  read_time TEXT NOT NULL DEFAULT '', blocks TEXT NOT NULL DEFAULT '[]',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS faq_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE, group_id INTEGER NOT NULL REFERENCES faq_groups(id) ON DELETE CASCADE,
  question TEXT NOT NULL, answer TEXT, featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, services TEXT NOT NULL DEFAULT '[]', outcome TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS needs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE, icon TEXT NOT NULL DEFAULT 'help',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ───────────── Submissions ─────────────
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_no TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('brief-builder','contact-page','product-demo','chat')),
  needs TEXT NOT NULL DEFAULT '[]', name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '', contact_method TEXT NOT NULL DEFAULT 'Email',
  budget TEXT NOT NULL DEFAULT '', timeline TEXT NOT NULL DEFAULT '', message TEXT NOT NULL,
  suggested_package TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','won','lost','spam')),
  notes TEXT NOT NULL DEFAULT '', ip TEXT, user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_no TEXT NOT NULL UNIQUE,
  role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL, role_title TEXT NOT NULL,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, portfolio TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','shortlisted','task-sent','interview','offer','rejected')),
  notes TEXT NOT NULL DEFAULT '', ip TEXT, user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('enquiry','application')), owner_id INTEGER NOT NULL,
  original_name TEXT NOT NULL, stored_name TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(owner_type, owner_id);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed')),
  source TEXT NOT NULL DEFAULT 'footer', token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Site assistant: one row per visitor conversation, one row per message.
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL UNIQUE,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TEXT,
  enquiry_ref TEXT,
  source_path TEXT NOT NULL DEFAULT '', user_agent TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last ON chat_sessions(last_message_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires ON chat_sessions(expires_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '[]',
  usage TEXT,
  latency_ms INTEGER,
  error_code TEXT,
  is_fallback INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, id);
