import { Controller, Get, Param, ParseIntPipe, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from '../admin/admin.guard';
import { Perm } from '../admin/permissions';
import { AttachmentsService } from './attachments.service';

/** Admin-only download of files attached to briefs and applications. */
@Controller('admin/attachments')
@UseGuards(AdminGuard)
@Perm('leads')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get(':id/download')
  download(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const f = this.attachments.file(id);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(f.path, f.name);
  }
}
