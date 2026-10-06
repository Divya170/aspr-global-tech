import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFiles, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AdminGuard } from '../admin/admin.guard';
import { Perm } from '../admin/permissions';
import { parseDataField, withUploads } from '../common/multipart';
import { clientIp, RateLimitGuard } from '../common/rate-limit.guard';
import { config } from '../config';
import { UploadErrorFilter } from '../uploads/upload-error.filter';
import { uploadOptions } from '../uploads/upload.options';
import { ListParams, LeadsService } from './leads.service';

/**
 * Public submissions. Both take multipart: a `data` part with the fields as JSON, plus up to
 * five `files`. They answer `{ refNo, message }`, or 400 with `errors: { field: message }`.
 */
@Controller()
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post('quote')
  @UseGuards(new RateLimitGuard('lead', 8, 10 * 60_000))
  @UseFilters(UploadErrorFilter)
  @UseInterceptors(FilesInterceptor('files', config.maxFiles, uploadOptions()))
  quote(@Body() body: Record<string, unknown>, @UploadedFiles() files: Express.Multer.File[], @Req() req: Request) {
    return withUploads(files, () => this.leads.create(parseDataField(body, files), 'quote', files || [], { ip: clientIp(req), userAgent: req.headers['user-agent'] }));
  }

  @Post('contact')
  @UseGuards(new RateLimitGuard('lead', 8, 10 * 60_000))
  @UseFilters(UploadErrorFilter)
  @UseInterceptors(FilesInterceptor('files', config.maxFiles, uploadOptions()))
  contact(@Body() body: Record<string, unknown>, @UploadedFiles() files: Express.Multer.File[], @Req() req: Request) {
    return withUploads(files, () => this.leads.create(parseDataField(body, files), 'contact', files || [], { ip: clientIp(req), userAgent: req.headers['user-agent'] }));
  }
}

/** Admin: the lead pipeline. */
@Controller('admin/leads')
@UseGuards(AdminGuard)
@Perm('leads')
export class LeadsAdminController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Query() q: ListParams) {
    return this.leads.list(q);
  }

  @Get('facets')
  facets() {
    return this.leads.facets();
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="aspr-leads.csv"')
  export(@Query() q: ListParams) {
    return this.leads.csv(q);
  }

  @Get(':id')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.leads.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.leads.update(id, body || {}, req.user!, req.ip);
  }

  @Post(':id/notes')
  @HttpCode(201)
  note(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.leads.addNote(id, body || {}, req.user!, req.ip);
  }

  @Delete(':id')
  @Perm('leads.delete')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.leads.remove(id, req.user!, req.ip);
  }
}
