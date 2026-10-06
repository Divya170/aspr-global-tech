import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { ValidationFailed } from '../common/errors';
import { config } from '../config';
import { ATTACHMENT_EXT, contentMatches, extOf } from './file-types';

const ALLOWED_LABEL = 'PDF, Word, Excel, PowerPoint, images (PNG, JPG, WebP) or ZIP';

/** Random stored name; the original name is kept only in the database. */
export function storedName(originalName: string): string {
  const ext = extOf(originalName).replace(/[^a-z0-9]/g, '');
  return `${Date.now()}-${randomBytes(12).toString('hex')}${ext ? '.' + ext : ''}`;
}

/** Multer config for client attachments: ≤10 MB each, ≤5 files, stored outside the web root. */
export function uploadOptions(): MulterOptions {
  const dir = path.join(config.uploadDir, 'files');
  return {
    storage: diskStorage({
      destination: (_req: Request, _file: Express.Multer.File, cb: (e: Error | null, dest: string) => void) => { fs.mkdirSync(dir, { recursive: true }); cb(null, dir); },
      filename: (_req: Request, file: Express.Multer.File, cb: (e: Error | null, name: string) => void) => cb(null, storedName(file.originalname)),
    }),
    limits: { fileSize: config.maxFileBytes, files: config.maxFiles, fields: 20, fieldSize: 64 * 1024 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: (e: Error | null, accept: boolean) => void) => {
      if (!ATTACHMENT_EXT.includes(extOf(file.originalname))) {
        return cb(new BadRequestException({ statusCode: 400, message: 'Unsupported file type.', errors: { files: `${file.originalname} isn't supported. Use ${ALLOWED_LABEL}.` } }), false);
      }
      cb(null, true);
    },
  };
}

/** Second check once files are on disk: contents must match the extension. Throws (and deletes them) if not. */
export function verifyUploads(files: Express.Multer.File[] | undefined): void {
  const bad = (files || []).find((f) => !contentMatches(f.path, extOf(f.originalname)));
  if (bad) {
    discard(files);
    throw new ValidationFailed({ files: `${bad.originalname} doesn't look like a real ${extOf(bad.originalname).toUpperCase()} file.` }, 'One of the files was rejected.');
  }
}

/** Deletes uploaded temp files (used when a submission is rejected). */
export function discard(files: Express.Multer.File[] | undefined): void {
  for (const f of files || []) fs.promises.unlink(f.path).catch(() => undefined);
}
