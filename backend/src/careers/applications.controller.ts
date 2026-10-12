import { Body, Controller, Delete, Get, Header, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFiles, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AdminGuard } from '../admin/admin.guard';
import { Perm } from '../admin/permissions';
import { config } from '../config';
import { parseDataField, withUploads } from '../common/multipart';
import { clientIp, RateLimitGuard } from '../common/rate-limit.guard';
import { UploadErrorFilter } from '../uploads/upload-error.filter';
import { uploadOptions } from '../uploads/upload.options';
import { AppListParams, ApplicationsService } from './applications.service';

/** Public: apply for an open role. */
@Controller('roles')
export class ApplicationsController {
  constructor(private readonly apps: ApplicationsService) {}

  @Post(':roleId/applications')
  @UseGuards(new RateLimitGuard('application', 6, 10 * 60_000))
  @UseFilters(UploadErrorFilter)
  @UseInterceptors(FilesInterceptor('files', config.maxFiles, uploadOptions()))
  apply(@Param('roleId', ParseIntPipe) roleId: number, @Body() body: Record<string, unknown>, @UploadedFiles() files: Express.Multer.File[], @Req() req: Request) {
    return withUploads(files, () => this.apps.create(roleId, parseDataField(body, files), files || [], { ip: clientIp(req), userAgent: req.headers['user-agent'] }));
  }
}

/** Admin: the hiring pipeline. */
@Controller('admin/applications')
@UseGuards(AdminGuard)
@Perm('applications')
export class ApplicationsAdminController {
  constructor(private readonly apps: ApplicationsService) {}

  @Get()
  list(@Query() q: AppListParams) { return this.apps.list(q); }

  /** Roles (open or closed) for the pipeline's role filter; managers have no content access. */
  @Get('roles')
  roles() { return this.apps.roles(); }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="aspr-applications.csv"')
  export(@Query() q: AppListParams) { return this.apps.csv(q); }

  @Get(':id')
  one(@Param('id', ParseIntPipe) id: number) { return this.apps.get(id); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() req: Request) { return this.apps.update(id, body || {}, req.user!, req.ip); }

  @Delete(':id')
  @Perm('leads.delete')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) { return this.apps.remove(id, req.user!, req.ip); }
}
