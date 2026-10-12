import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from '../admin/admin.guard';
import { Perm } from '../admin/permissions';
import { describeCollections } from './collections';
import { ContentService } from './content.service';

/** Admin CRUD for every content collection + site settings. */
@Controller('admin')
@UseGuards(AdminGuard)
export class ContentAdminController {
  constructor(private readonly content: ContentService) {}

  @Get('content/schema')
  @Perm('content')
  schema() {
    return describeCollections();
  }

  @Get('content/:collection')
  @Perm('content')
  list(@Param('collection') collection: string, @Query() query: Record<string, string>) {
    const { q, page, pageSize, active, ...filters } = query;
    return this.content.list(collection, { q, page: Number(page), pageSize: Number(pageSize) || 50, includeInactive: true, active, filters });
  }

  @Get('content/:collection/:id')
  @Perm('content')
  one(@Param('collection') collection: string, @Param('id', ParseIntPipe) id: number) {
    return this.content.get(collection, id);
  }

  @Post('content/:collection')
  @Perm('content')
  create(@Param('collection') collection: string, @Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.content.create(collection, body || {}, { user: req.user, ip: req.ip });
  }

  @Patch('content/:collection/:id')
  @Perm('content')
  update(@Param('collection') collection: string, @Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.content.update(collection, id, body || {}, { user: req.user, ip: req.ip });
  }

  @Delete('content/:collection/:id')
  @Perm('content')
  remove(@Param('collection') collection: string, @Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.content.remove(collection, id, { user: req.user, ip: req.ip });
  }

  @Get('settings')
  @Perm('settings')
  settings() {
    return this.content.settings();
  }

  @Put('settings/:key')
  @Perm('settings')
  saveSetting(@Param('key') key: string, @Body() body: { value?: unknown }, @Req() req: Request) {
    return this.content.saveSetting(key, body?.value, { user: req.user, ip: req.ip });
  }
}
