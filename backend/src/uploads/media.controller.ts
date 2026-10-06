import { Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, Res, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import type { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { AdminGuard } from '../admin/admin.guard';
import { Perm } from '../admin/permissions';
import { config } from '../config';
import { MEDIA_DIR, MediaService } from './media.service';
import { UploadErrorFilter } from './upload-error.filter';
import { storedName } from './upload.options';

const mediaUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { fs.mkdirSync(MEDIA_DIR(), { recursive: true }); cb(null, MEDIA_DIR()); },
    filename: (_req, file, cb) => cb(null, storedName(file.originalname)),
  }),
  limits: { fileSize: config.maxVideoBytes, files: 1 },
};

@Controller('admin/media')
@UseGuards(AdminGuard)
@Perm('media')
export class MediaAdminController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@Query() q: Record<string, string>) {
    return this.media.list({ kind: q.kind, q: q.q, page: Number(q.page), pageSize: Number(q.pageSize) });
  }

  @Post()
  @UseFilters(UploadErrorFilter)
  @UseInterceptors(FileInterceptor('file', mediaUpload))
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return this.media.save(file, req.user!, req.ip);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.media.remove(id, req.user!, req.ip);
  }
}

/** Public media. Names are random and content never changes, so it is cached for a year. */
@Controller('media')
export class MediaPublicController {
  constructor(private readonly media: MediaService) {}

  @Get(':name')
  serve(@Param('name') name: string, @Res() res: Response) {
    const f = this.media.file(name);
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.sendFile(f.path, { headers: { 'Content-Type': f.mime }, lastModified: false });
  }
}
