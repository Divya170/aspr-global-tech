import type { DatabaseService } from '../database.service';

const TS = `created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))`;
const PUBLISHING = `sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1`;

/** Old brief-builder needs → the quote form's project types, for existing leads. */
const NEED_TO_TYPE: Record<string, string> = {
  Website: 'Website', App: 'Mobile App', 'SaaS / Software': 'Web Application', 'Business Systems': 'Custom Software',
  'AI / Chatbot': 'Custom Software', Logo: 'Branding', Graphics: 'Branding', Game: 'Other', Video: 'Other', SEO: 'Other',
  'Product demo': 'Custom Software', 'Not sure yet': 'Other',
};

/**
 * v2 platform schema: staff accounts and sessions, the lead pipeline (statuses, assignment,
 * notes), portfolio projects with categories and technologies, service detail pages,
 * testimonials, uploaded media, notifications, the activity log and the email outbox.
 */
export function up(db: DatabaseService): void {
  db.exec(`
    -- ───────────── Accounts ─────────────
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('super_admin','admin','manager','editor','client')),
      kind TEXT NOT NULL DEFAULT 'staff' CHECK (kind IN ('staff','client')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
      failed_logins INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT, last_login_at TEXT, password_changed_at TEXT,
      ${TS}
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,                       -- SHA-256 of the cookie token; the token itself is never stored
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf TEXT NOT NULL,
      ip TEXT, user_agent TEXT,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_sessions_user ON sessions(user_id);
    CREATE INDEX idx_sessions_expires ON sessions(expires_at);
    CREATE TABLE password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL, used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_password_resets_user ON password_resets(user_id);

    -- ───────────── Leads (the enquiries table, rebuilt for the v2 pipeline) ─────────────
    CREATE TABLE enquiries_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_no TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL CHECK (source IN ('quote','contact','chat','brief-builder','contact-page','product-demo')),
      project_type TEXT NOT NULL DEFAULT '',
      needs TEXT NOT NULL DEFAULT '[]',
      name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '', contact_method TEXT NOT NULL DEFAULT 'Email',
      budget TEXT NOT NULL DEFAULT '', timeline TEXT NOT NULL DEFAULT '', message TEXT NOT NULL,
      heard_from TEXT NOT NULL DEFAULT '',
      suggested_package TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal-sent','negotiation','won','lost','spam')),
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT NOT NULL DEFAULT '',
      ip TEXT, user_agent TEXT,
      ${TS}
    );
    INSERT INTO enquiries_v2 (id, ref_no, source, needs, name, email, phone, company, contact_method, budget, timeline, message,
      suggested_package, status, notes, ip, user_agent, created_at, updated_at)
      SELECT id, ref_no, source, needs, name, email, phone, company, contact_method, budget, timeline, message,
      suggested_package, status, notes, ip, user_agent, created_at, updated_at FROM enquiries;
    DROP TABLE enquiries;
    ALTER TABLE enquiries_v2 RENAME TO enquiries;
    CREATE INDEX idx_enquiries_status ON enquiries(status);
    CREATE INDEX idx_enquiries_created ON enquiries(created_at);
    CREATE INDEX idx_enquiries_assigned ON enquiries(assigned_to);
    CREATE INDEX idx_enquiries_type ON enquiries(project_type);
    CREATE INDEX idx_enquiries_email ON enquiries(email);

    CREATE TABLE lead_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enquiry_id INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_lead_notes_enquiry ON lead_notes(enquiry_id, id);
    INSERT INTO lead_notes (enquiry_id, body, created_at) SELECT id, notes, updated_at FROM enquiries WHERE TRIM(notes) <> '';

    -- ───────────── Portfolio, services, technologies ─────────────
    CREATE TABLE technologies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      grp TEXT NOT NULL CHECK (grp IN ('frontend','backend','database','mobile','3d','infrastructure','design','platforms')),
      ${PUBLISHING}, ${TS}
    );
    CREATE INDEX idx_technologies_grp ON technologies(grp, sort);

    CREATE TABLE project_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      ${PUBLISHING}, ${TS}
    );

    CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      client TEXT NOT NULL DEFAULT '',
      category_id INTEGER NOT NULL REFERENCES project_categories(id) ON DELETE RESTRICT,
      year INTEGER,
      summary TEXT NOT NULL DEFAULT '',
      overview TEXT NOT NULL DEFAULT '', challenge TEXT NOT NULL DEFAULT '', solution TEXT NOT NULL DEFAULT '',
      features TEXT NOT NULL DEFAULT '[]', results TEXT NOT NULL DEFAULT '[]', process TEXT NOT NULL DEFAULT '[]',
      cover_image TEXT, cover_alt TEXT NOT NULL DEFAULT '', cover_pos TEXT NOT NULL DEFAULT 'center',
      gallery TEXT NOT NULL DEFAULT '[]',
      video_url TEXT NOT NULL DEFAULT '', live_url TEXT NOT NULL DEFAULT '',
      case_study INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT NOT NULL DEFAULT '', seo_description TEXT NOT NULL DEFAULT '',
      ${PUBLISHING}, ${TS}
    );
    CREATE INDEX idx_projects_category ON projects(category_id);
    CREATE INDEX idx_projects_featured ON projects(featured, sort);

    CREATE TABLE project_technologies (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      technology_id INTEGER NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, technology_id)
    );
    CREATE INDEX idx_project_technologies_tech ON project_technologies(technology_id);

    ALTER TABLE services ADD COLUMN slug TEXT;
    ALTER TABLE services ADD COLUMN tagline TEXT NOT NULL DEFAULT '';
    ALTER TABLE services ADD COLUMN intro TEXT NOT NULL DEFAULT '';
    ALTER TABLE services ADD COLUMN outcomes TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE services ADD COLUMN deliverables TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE services ADD COLUMN ideal_for TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE services ADD COLUMN process TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE services ADD COLUMN timeline TEXT NOT NULL DEFAULT '';
    ALTER TABLE services ADD COLUMN budget TEXT NOT NULL DEFAULT '';
    ALTER TABLE services ADD COLUMN add_ons TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE services ADD COLUMN faqs TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE services ADD COLUMN seo_title TEXT NOT NULL DEFAULT '';
    ALTER TABLE services ADD COLUMN seo_description TEXT NOT NULL DEFAULT '';
    CREATE UNIQUE INDEX idx_services_slug ON services(slug);

    CREATE TABLE service_technologies (
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      technology_id INTEGER NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
      PRIMARY KEY (service_id, technology_id)
    );
    CREATE INDEX idx_service_technologies_tech ON service_technologies(technology_id);

    CREATE TABLE project_services (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, service_id)
    );
    CREATE INDEX idx_project_services_service ON project_services(service_id);

    -- Only genuine, client-approved testimonials: the API refuses to publish one without consent.
    CREATE TABLE testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', position TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      image TEXT, rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
      consent INTEGER NOT NULL DEFAULT 0,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      ${PUBLISHING}, ${TS}
    );
    CREATE INDEX idx_testimonials_project ON testimonials(project_id);

    -- Legal and other simple pages, edited as blocks like articles.
    CREATE TABLE pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
      blocks TEXT NOT NULL DEFAULT '[]',
      ${PUBLISHING}, ${TS}
    );

    -- Images and videos uploaded in the admin for portfolio, services and testimonials.
    CREATE TABLE media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK (kind IN ('image','video')),
      original_name TEXT NOT NULL, stored_name TEXT NOT NULL UNIQUE,
      mime TEXT NOT NULL, size INTEGER NOT NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ───────────── Operations ─────────────
    CREATE TABLE notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL DEFAULT '', entity TEXT, entity_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_notifications_created ON notifications(created_at);
    CREATE TABLE notification_reads (
      notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (notification_id, user_id)
    );
    CREATE INDEX idx_notification_reads_user ON notification_reads(user_id);

    CREATE TABLE activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor TEXT NOT NULL DEFAULT 'Website',
      action TEXT NOT NULL, entity TEXT NOT NULL DEFAULT '', entity_id INTEGER,
      summary TEXT NOT NULL DEFAULT '', ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_activity_created ON activity_logs(created_at);
    CREATE INDEX idx_activity_entity ON activity_logs(entity, entity_id);
    CREATE INDEX idx_activity_user ON activity_logs(user_id);

    CREATE TABLE email_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template TEXT NOT NULL, to_addr TEXT NOT NULL, reply_to TEXT,
      subject TEXT NOT NULL, html TEXT NOT NULL, text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
      attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT,
      send_after TEXT NOT NULL DEFAULT (datetime('now')), sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_email_outbox_due ON email_outbox(status, send_after);
  `);

  // Existing leads get a project type from their first brief need, so the service-demand chart has history.
  for (const r of db.all<{ id: number; needs: string }>('SELECT id, needs FROM enquiries')) {
    let first = '';
    try { first = (JSON.parse(r.needs) as string[])[0] || ''; } catch { /* keep empty */ }
    db.run('UPDATE enquiries SET project_type = ? WHERE id = ?', [NEED_TO_TYPE[first] || (first ? 'Other' : ''), r.id]);
  }
}
