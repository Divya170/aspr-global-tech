import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { SessionUser } from '../admin/permissions';

export interface ActivityInput {
  action: string;
  entity?: string;
  entityId?: number | null;
  summary?: string;
}

/** Append-only audit trail of admin actions and website events (new leads, applications). */
@Injectable()
export class ActivityService {
  constructor(private readonly db: DatabaseService) {}

  log(actor: SessionUser | null | undefined, input: ActivityInput, ip?: string): void {
    this.db.run('INSERT INTO activity_logs (user_id, actor, action, entity, entity_id, summary, ip) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      actor?.id ?? null, actor?.name ?? 'Website', input.action, input.entity ?? '', input.entityId ?? null,
      (input.summary ?? '').slice(0, 500), ip ?? null,
    ]);
  }

  list(p: { entity?: string; entityId?: number; userId?: number; page?: number; pageSize?: number }) {
    const w: string[] = [], params: unknown[] = [];
    if (p.entity) { w.push('entity = ?'); params.push(p.entity); }
    if (p.entityId) { w.push('entity_id = ?'); params.push(p.entityId); }
    if (p.userId) { w.push('user_id = ?'); params.push(p.userId); }
    const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
    const pageSize = Math.min(Math.max(Number(p.pageSize) || 30, 1), 100);
    const page = Math.max(Number(p.page) || 1, 1);
    const total = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM activity_logs ${where}`, params)!.n;
    const items = this.db.all(`SELECT id, user_id AS userId, actor, action, entity, entity_id AS entityId, summary, created_at AS createdAt
      FROM activity_logs ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}
