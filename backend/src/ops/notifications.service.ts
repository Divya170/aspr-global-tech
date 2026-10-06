import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface NotificationInput {
  type: 'lead' | 'contact' | 'application' | 'project' | 'system';
  title: string;
  body?: string;
  link?: string;
  entity?: string;
  entityId?: number;
}

/** Staff notifications (the admin bell). One row per event; read state is tracked per user. */
@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  create(n: NotificationInput): void {
    this.db.run('INSERT INTO notifications (type, title, body, link, entity, entity_id) VALUES (?, ?, ?, ?, ?, ?)',
      [n.type, n.title.slice(0, 200), (n.body ?? '').slice(0, 500), n.link ?? '', n.entity ?? null, n.entityId ?? null]);
  }

  forUser(userId: number, limit = 30) {
    const items = this.db.all(`SELECT n.id, n.type, n.title, n.body, n.link, n.created_at AS createdAt, r.read_at AS readAt
      FROM notifications n LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = ?
      ORDER BY n.id DESC LIMIT ?`, [userId, Math.min(Math.max(limit, 1), 100)]).map((r) => ({ ...r, read: !!r.readAt }));
    const unread = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM notifications n
      WHERE NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.user_id = ?)`, [userId])!.n;
    return { items, unread };
  }

  markRead(userId: number, ids: number[]): void {
    for (const id of ids.filter((x) => Number.isInteger(x) && x > 0).slice(0, 200)) {
      this.db.run('INSERT OR IGNORE INTO notification_reads (notification_id, user_id) SELECT id, ? FROM notifications WHERE id = ?', [userId, id]);
    }
  }

  markAllRead(userId: number): void {
    this.db.run(`INSERT OR IGNORE INTO notification_reads (notification_id, user_id)
      SELECT id, ? FROM notifications`, [userId]);
  }
}
