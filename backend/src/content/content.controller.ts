import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { str } from '../common/rules';
import { ContentService, PUBLIC_SETTINGS } from './content.service';

const PUBLIC = ['services', 'products', 'industries', 'work', 'steps', 'roles', 'articles', 'faq-groups', 'faqs', 'packages', 'needs'];

/** Public, read-only content API used by the Next.js site. Only published items are returned. */
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('health')
  health() {
    return { ok: true, time: new Date().toISOString() };
  }

  @Get('content/home')
  home() {
    return this.content.home();
  }

  @Get('content/company')
  company() {
    return this.content.company();
  }

  @Get('settings/public')
  settings() {
    return this.content.settings(PUBLIC_SETTINGS);
  }

  @Post('packages/suggest')
  @HttpCode(200)
  suggest(@Body() body: { needs?: unknown }) {
    const needs = Array.isArray(body?.needs) ? body.needs.map(str).filter(Boolean) : [];
    return { package: this.content.suggest(needs) };
  }

  @Get('content/articles/slug/:slug')
  article(@Param('slug') slug: string) {
    return this.content.articleBySlug(slug);
  }

  /** GET /api/content/services?pillar=Build · /api/content/articles?category=Grow&q=seo · /api/content/faqs?groupId=2 … */
  @Get('content/:collection')
  list(@Param('collection') collection: string, @Query() query: Record<string, string>) {
    if (!PUBLIC.includes(collection)) return this.content.def('__none__');
    const { q, page, pageSize, ...filters } = query;
    return this.content.list(collection, { q, page: Number(page), pageSize: Number(pageSize), filters });
  }

  @Get('content/:collection/:id')
  one(@Param('collection') collection: string, @Param('id') id: string) {
    if (!PUBLIC.includes(collection)) return this.content.def('__none__');
    return this.content.get(collection, Number(id), false);
  }
}
