import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { DatabaseService } from '../database/database.service';

export type OwnerType = 'enquiry' | 'application';

export interface Attachment { id: number; name: string; mime: string; size: number; createdAt: string }

@Injectable()
export class AttachmentsService {
  constructor(private readonly db: DatabaseService) {}

  /** Records uploaded files against their owner (call inside the owner's transaction). */
  save(ownerType: OwnerType, ownerId: number, files: Express.Multer.File[] = []): void {
    for (const f of files) {
      this.db.run('INSERT INTO attachments (owner_type, owner_id, original_name, stored_name, mime, size) VALUES (?, ?, ?, ?, ?, ?)',
        [ownerType, ownerId, f.originalname.slice(0, 255), f.filename, f.mimetype || 'application/octet-stream', f.size]);
    }
  }

  list(ownerType: OwnerType, ownerId: number): Attachment[] {
    return this.db.all('SELECT id, original_name, mime, size, created_at FROM attachments WHERE owner_type = ? AND owner_id = ? ORDER BY id', [ownerType, ownerId])
      .map((r) => ({ id: r.id, name: r.original_name, mime: r.mime, size: r.size, createdAt: r.created_at }));
  }

  countFor(ownerType: OwnerType, ownerId: number): number {
    return (this.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM attachments WHERE owner_type = ? AND owner_id = ?', [ownerType, ownerId])?.n) ?? 0;
  }

  file(id: number): { path: string; name: string; mime: string } {
    const r = this.db.get('SELECT stored_name, original_name, mime FROM attachments WHERE id = ?', [id]);
    if (!r) throw new NotFoundException('Attachment not found');
    const p = path.join(config.uploadDir, 'files', path.basename(r.stored_name));
    if (!fs.existsSync(p)) throw new NotFoundException('The file is no longer on disk');
    return { path: p, name: r.original_name, mime: r.mime };
  }

  /** Removes rows and files for an owner (call when deleting the owner). */
  removeFor(ownerType: OwnerType, ownerId: number): void {
    const rows = this.db.all('SELECT stored_name FROM attachments WHERE owner_type = ? AND owner_id = ?', [ownerType, ownerId]);
    this.db.run('DELETE FROM attachments WHERE owner_type = ? AND owner_id = ?', [ownerType, ownerId]);
    for (const r of rows) fs.promises.unlink(path.join(config.uploadDir, 'files', path.basename(r.stored_name))).catch(() => undefined);
  }
}
