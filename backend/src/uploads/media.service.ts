import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { fail } from '../common/errors';
import { config } from '../config';
import { DatabaseService } from '../database/database.service';
import type { SessionUser } from '../admin/permissions';
import { ActivityService } from '../ops/activity.service';
import { contentMatches, extOf, IMAGE_EXT, mimeFor, VIDEO_EXT } from './file-types';

export const MEDIA_DIR = () => path.join(config.uploadDir, 'media');
export const MEDIA_NAME = /^\d{13}-[a-f0-9]{24}\.(png|jpe?g|webp|avif|gif|mp4|m4v|webm)$/;

/** Images and videos uploaded in the admin, served publicly at /api/media/<name>. */
@Injectable()
export class MediaService {
  constructor(private readonly db: DatabaseService, private readonly activity: ActivityService) {}

  private map = (r: any) => ({ id: r.id, kind: r.kind, name: r.original_name, url: `/api/media/${r.stored_name}`, mime: r.mime, size: r.size, createdAt: r.created_at });

  save(file: Express.Multer.File | undefined, user: SessionUser, ip?: string) {
    if (!file) fail({ file: 'Choose a file to upload.' });
    const ext = extOf(file.originalname);
    const kind = IMAGE_EXT.includes(ext) ? 'image' : VIDEO_EXT.includes(ext) ? 'video' : null;
    const reject = (msg: string): never => { fs.promises.unlink(file.path).catch(() => undefined); fail({ file: msg }); };
    if (!kind) reject('Upload an image (PNG, JPG, WebP, AVIF, GIF) or a video (MP4, WebM).');
    if (kind === 'image' && file.size > config.maxImageBytes) reject(`Images must be ${config.maxImageBytes / 1048576} MB or smaller. Compress it first (e.g. export as WebP).`);
    if (!contentMatches(file.path, ext)) reject(`${file.originalname} doesn't look like a real ${ext.toUpperCase()} file.`);
    const id = this.db.run('INSERT INTO media (kind, original_name, stored_name, mime, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [kind, file.originalname.slice(0, 255), file.filename, mimeFor(ext), file.size, user.id]).lastInsertRowid;
    this.activity.log(user, { action: 'media.uploaded', entity: 'media', entityId: id, summary: `Uploaded ${file.originalname}` }, ip);
    return this.map(this.db.get('SELECT * FROM media WHERE id = ?', [id]));
  }

  list(p: { kind?: string; q?: string; page?: number; pageSize?: number }) {
    const w: string[] = [], params: unknown[] = [];
    if (p.kind === 'image' || p.kind === 'video') { w.push('kind = ?'); params.push(p.kind); }
    if (p.q) { w.push('LOWER(original_name) LIKE ?'); params.push(`%${String(p.q).toLowerCase()}%`); }
    const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
    const pageSize = Math.min(Math.max(Number(p.pageSize) || 48, 1), 100);
    const page = Math.max(Number(p.page) || 1, 1);
    const total = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM media ${where}`, params)!.n;
    const items = this.db.all(`SELECT * FROM media ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]).map(this.map);
    return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  remove(id: number, user: SessionUser, ip?: string) {
    const r = this.db.get('SELECT * FROM media WHERE id = ?', [id]);
    if (!r) throw new NotFoundException('File not found');
    this.db.run('DELETE FROM media WHERE id = ?', [id]);
    fs.promises.unlink(path.join(MEDIA_DIR(), path.basename(r.stored_name))).catch(() => undefined);
    this.activity.log(user, { action: 'media.deleted', entity: 'media', entityId: id, summary: `Deleted ${r.original_name}` }, ip);
    return { deleted: true, id };
  }

  /** Path for a public media file, only if it is a registered upload. */
  file(name: string): { path: string; mime: string } {
    if (!MEDIA_NAME.test(name)) throw new NotFoundException();
    const r = this.db.get('SELECT stored_name, mime FROM media WHERE stored_name = ?', [name]);
    const p = r && path.join(MEDIA_DIR(), path.basename(r.stored_name));
    if (!p || !fs.existsSync(p)) throw new NotFoundException();
    return { path: p, mime: r.mime };
  }
}
