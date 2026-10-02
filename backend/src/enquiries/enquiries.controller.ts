import { Body, Controller, Delete, Get, Header, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFiles, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AdminGuard } from '../admin/admin.guard';
import { parseDataField, withUploads } from '../common/multipart';
import { clientIp, RateLimitGuard } from '../common/rate-limit.guard';
import { UploadErrorFilter } from '../uploads/upload-error.filter';
import { uploadOptions } from '../uploads/upload.options';
import { EnquiriesService, ListParams } from './enquiries.service';

/** Public: project briefs from the home brief builder and the contact page. */
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Post()
  @UseGuards(new RateLimitGuard('enquiry', 8, 10 * 60_000))
  @UseFilters(UploadErrorFilter)
  @UseInterceptors(FilesInterceptor('files', 10, uploadOptions()))
  create(@Body() body: Record<string, unknown>, @UploadedFiles() files: Express.Multer.File[], @Req() req: Request) {
    return withUploads(files, () => this.enquiries.create(parseDataField(body, files), files || [], { ip: clientIp(req), userAgent: req.headers['user-agent'] }));
  }
}

/** Admin: review, triage, annotate, export and delete enquiries. */
@Controller('admin/enquiries')
@UseGuards(AdminGuard)
export class EnquiriesAdminController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Get()
  list(@Query() q: ListParams) {
    return this.enquiries.list(q);
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="aspr-enquiries.csv"')
  export(@Query() q: ListParams) {
    return this.enquiries.csv(q);
  }

  @Get(':id')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.enquiries.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.enquiries.update(id, body || {});
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.enquiries.remove(id);
  }
}
