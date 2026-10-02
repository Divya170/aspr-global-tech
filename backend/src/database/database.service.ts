import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { seedDatabase } from './seed';

export type Row = Record<string, any>;
type Param = string | number | bigint | null | Buffer;

/**
 * Owns the single SQLite connection. On boot it applies database/schema.sql
 * (idempotent) and seeds the content tables from database/seed/content.json
 * when the database is new. All queries use positional parameters.
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
    this.db.exec(fs.readFileSync(config.schemaPath, 'utf8'));
    this.migrate();
    const seeded = this.get('SELECT value FROM schema_meta WHERE key = ?', ['seeded_at']);
    if (!seeded) {
      const counts = seedDatabase(this, JSON.parse(fs.readFileSync(config.seedPath, 'utf8')));
      this.run('INSERT INTO schema_meta (key, value) VALUES (?, ?)', ['seeded_at', new Date().toISOString()]);
      this.logger.log(`Seeded content: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }
    this.logger.log(`SQLite ready at ${file}`);
  }

  /**
   * In-place upgrades for databases created by an older schema.sql. SQLite cannot
   * alter a CHECK constraint, so the enquiries table is rebuilt (rows kept) when
   * it predates the 'chat' source.
   */
  private migrate(): void {
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
