import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService, PUBLIC_SETTINGS } from './content.service';

const PUBLIC = ['services', 'products', 'industries', 'steps', 'roles', 'articles', 'faq-groups', 'faqs', 'technologies', 'project-categories'];

/**
 * Public, read-only content API used by the Next.js site. Only published items are returned.
 * Page endpoints return everything one page renders in a single request.
 */
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('health')
  health() {
    return { ok: true, time: new Date().toISOString() };
  }

  @Get('site')
  site() {
    return this.content.site();
  }

  @Get('settings/public')
  settings() {
    return this.content.settings(PUBLIC_SETTINGS);
  }

  @Get('pages/home')
  home() {
    return this.content.home();
  }

  @Get('pages/about')
  about() {
    return this.content.about();
  }

  @Get('pages/process')
  process() {
    return this.content.process();
  }

  @Get('pages/careers')
  careers() {
    return this.content.careers();
  }

  @Get('pages/sitemap')
  sitemap() {
    return this.content.sitemap();
  }

  @Get('pages/:slug')
  page(@Param('slug') slug: string) {
    return this.content.page(slug);
  }

  @Get('services')
  services() {
    return this.content.services();
  }

  @Get('services/:slug')
  service(@Param('slug') slug: string) {
    return this.content.service(slug);
  }

  /** GET /api/projects?category=web-applications */
  @Get('projects')
  projects(@Query('category') category?: string) {
    return this.content.projects(category);
  }

  @Get('projects/:slug')
  project(@Param('slug') slug: string) {
    return this.content.project(slug);
  }

  @Get('technologies')
  technologies() {
    return this.content.technologies();
  }

  @Get('testimonials')
  testimonials() {
    return this.content.publicTestimonials();
  }

  @Get('faqs')
  faqs() {
    return this.content.faqs();
  }

  @Get('articles')
  articles() {
    return this.content.articles();
  }

  @Get('articles/:slug')
  article(@Param('slug') slug: string) {
    return this.content.article(slug);
  }

  /** Generic collection reads: /api/content/industries?q=… */
  @Get('content/:collection')
  list(@Param('collection') collection: string, @Query() query: Record<string, string>) {
    if (!PUBLIC.includes(collection)) return this.content.def('__none__');
    const { q, page, pageSize, ...filters } = query;
    return this.content.list(collection, { q, page: Number(page), pageSize: Number(pageSize), filters });
  }
}
