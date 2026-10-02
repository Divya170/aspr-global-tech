import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { config } from '../config';

export const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt', 'key', 'fig', 'zip'];

/** Multer config for brief / application attachments: PDF, images or docs, ≤10 MB each, ≤10 files. */
export function uploadOptions(): MulterOptions {
  const dir = path.join(config.uploadDir, 'files');
  return {
    storage: diskStorage({
      destination: (_req: Request, _file: Express.Multer.File, cb: (e: Error | null, dest: string) => void) => { fs.mkdirSync(dir, { recursive: true }); cb(null, dir); },
      filename: (_req: Request, file: Express.Multer.File, cb: (e: Error | null, name: string) => void) => {
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
        cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: config.maxFileBytes, files: config.maxFiles, fields: 20, fieldSize: 64 * 1024 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: (e: Error | null, accept: boolean) => void) => {
      const ext = path.extname(file.originalname).slice(1).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        return cb(new BadRequestException({ statusCode: 400, message: 'Unsupported file type.', errors: { files: `${file.originalname} isn't a supported file — use PDF, images or docs.` } }), false);
      }
      cb(null, true);
    },
  };
}

/** Deletes uploaded temp files (used when a submission is rejected). */
export function discard(files: Express.Multer.File[] | undefined): void {
  for (const f of files || []) fs.promises.unlink(f.path).catch(() => undefined);
}
