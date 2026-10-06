import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { MIGRATIONS } from './migrations';
import { seedDatabase } from './seed';

export type Row = Record<string, any>;
type Param = string | number | bigint | null | Buffer;

/**
 * Owns the single SQLite connection. On boot it brings any database up to date:
 *  1. databases that predate the migration runner get database/schema.sql (the v1 baseline,
 *     idempotent) and the legacy in-place upgrade;
 *  2. a brand-new database is seeded with the v1 content from database/seed/content.json;
 *  3. every migration in ./migrations not yet recorded in schema_migrations runs, in order,
 *     each in its own transaction.
 * New and existing databases therefore take the same path. All queries use positional parameters.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Database');
  private db!: Database.Database;

  onModuleInit(): void {
    this.open(config.dbPath);
  }

  onModuleDestroy(): void {
    this.db?.close();
  }

  open(file: string): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    if (!this.hasTable('schema_migrations')) {
      this.db.exec(fs.readFileSync(config.schemaPath, 'utf8'));
      this.legacyMigrate();
    }
    const seeded = this.get('SELECT value FROM schema_meta WHERE key = ?', ['seeded_at']);
    if (!seeded) {
      const counts = seedDatabase(this, JSON.parse(fs.readFileSync(config.seedPath, 'utf8')));
      this.run('INSERT INTO schema_meta (key, value) VALUES (?, ?)', ['seeded_at', new Date().toISOString()]);
      this.logger.log(`Seeded content: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }
    this.runMigrations();
    this.logger.log(`SQLite ready at ${file}`);
  }

  hasTable(name: string): boolean {
    return !!this.get("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", [name]);
  }

  hasColumn(table: string, column: string): boolean {
    return this.all<{ name: string }>(`PRAGMA table_info(${table})`).some((c) => c.name === column);
  }

  /** Runs pending migrations in order. Foreign keys are off while a migration rebuilds tables. */
  private runMigrations(): void {
    this.db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
    const done = new Set(this.all<{ id: string }>('SELECT id FROM schema_migrations').map((r) => r.id));
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      this.db.exec('PRAGMA foreign_keys = OFF');
      try {
        this.tx(() => {
          m.up(this);
          const broken = this.all('PRAGMA foreign_key_check');
          if (broken.length) throw new Error(`foreign key check failed: ${JSON.stringify(broken.slice(0, 3))}`);
          this.run('INSERT INTO schema_migrations (id) VALUES (?)', [m.id]);
        });
      } catch (e) {
        this.logger.error(`Migration ${m.id} failed and was rolled back: ${(e as Error).message}`);
        throw e;
      } finally {
        this.db.exec('PRAGMA foreign_keys = ON');
      }
      this.logger.log(`Applied migration ${m.id}`);
    }
  }

  /** Executes a block of SQL statements (DDL inside migrations). */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * In-place upgrade for v1 databases created before the chat source existed. SQLite cannot
   * alter a CHECK constraint, so the enquiries table is rebuilt (rows kept).
   */
  private legacyMigrate(): void {
    const ddl = this.get<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'enquiries'")?.sql || '';
    if (ddl && !ddl.includes("'chat'")) {
      this.db.exec('PRAGMA foreign_keys = OFF');
      this.tx(() => {
        this.db.exec(`ALTER TABLE enquiries RENAME TO enquiries_old`);
        this.db.exec(ddl.replace(/CREATE TABLE "?enquiries_old"?|CREATE TABLE "?enquiries"?/, 'CREATE TABLE enquiries')
          .replace("'product-demo')", "'product-demo','chat')"));
        this.db.exec('INSERT INTO enquiries SELECT * FROM enquiries_old');
        this.db.exec('DROP TABLE enquiries_old');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status)');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at)');
      });
      this.db.exec('PRAGMA foreign_keys = ON');
      this.logger.log("Migrated enquiries table: added 'chat' source");
    }
  }

  private clean(params: unknown[]): Param[] {
    return params.map((p) => {
      if (p === undefined || p === null) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (typeof p === 'object' && !(p instanceof Buffer)) return JSON.stringify(p);
      return p as Param;
    });
  }

  all<T = Row>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...this.clean(params)) as T[];
  }

  get<T = Row>(sql: string, params: unknown[] = []): T | undefined {
    return this.db.prepare(sql).get(...this.clean(params)) as T | undefined;
  }

  run(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    const r = this.db.prepare(sql).run(...this.clean(params));
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  }

  /** Runs `fn` inside a transaction; rolls back if it throws. */
  tx<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const out = fn();
      this.db.exec('COMMIT');
      return out;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}

/** Safe JSON column parse. */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
