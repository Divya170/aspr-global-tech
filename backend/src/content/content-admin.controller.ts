import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { describeCollections } from './collections';
import { ContentService } from './content.service';

/** Admin CRUD for every content collection + site settings. */
@Controller('admin')
@UseGuards(AdminGuard)
export class ContentAdminController {
  constructor(private readonly content: ContentService) {}

  @Get('content/schema')
  schema() {
    return describeCollections();
  }

  @Get('content/:collection')
  list(@Param('collection') collection: string, @Query() query: Record<string, string>) {
    const { q, page, pageSize, ...filters } = query;
    return this.content.list(collection, { q, page: Number(page), pageSize: Number(pageSize) || 50, includeInactive: true, filters });
  }

  @Get('content/:collection/:id')
  one(@Param('collection') collection: string, @Param('id', ParseIntPipe) id: number) {
    return this.content.get(collection, id);
  }

  @Post('content/:collection')
  create(@Param('collection') collection: string, @Body() body: Record<string, unknown>) {
    return this.content.create(collection, body || {});
  }

  @Patch('content/:collection/:id')
  update(@Param('collection') collection: string, @Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.content.update(collection, id, body || {});
  }

  @Delete('content/:collection/:id')
  remove(@Param('collection') collection: string, @Param('id', ParseIntPipe) id: number) {
    return this.content.remove(collection, id);
  }

  @Get('settings')
  settings() {
    return this.content.settings();
  }

  @Put('settings/:key')
  saveSetting(@Param('key') key: string, @Body() body: { value?: unknown }) {
    return this.content.saveSetting(key, body?.value);
  }
}
