import type { DatabaseService } from '../database.service';
import * as platform from './002-platform';
import * as content from './003-content';
import * as copy from './004-copy';

export interface Migration { id: string; up: (db: DatabaseService) => void }

/**
 * Ordered schema and data migrations, applied once each and recorded in schema_migrations.
 * Never edit a migration that has shipped; add a new one. (001 is database/schema.sql, the v1 baseline.)
 */
export const MIGRATIONS: Migration[] = [
  { id: '002-platform', up: platform.up },
  { id: '003-content', up: content.up },
  { id: '004-copy', up: copy.up },
];
