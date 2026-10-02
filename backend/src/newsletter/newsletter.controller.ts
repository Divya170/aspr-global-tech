import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly news: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard('newsletter', 10, 10 * 60_000))
  subscribe(@Body() body: Record<string, unknown>) { return this.news.subscribe(body || {}); }

  @Get('unsubscribe')
  unsubscribe(@Query('token') token: string) { return this.news.unsubscribe(token); }
}

@Controller('admin/subscribers')
@UseGuards(AdminGuard)
export class NewsletterAdminController {
  constructor(private readonly news: NewsletterService) {}

  @Get()
  list(@Query() q: Record<string, string>) { return this.news.list(q); }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="aspr-subscribers.csv"')
  export(@Query() q: Record<string, string>) { return this.news.csv(q); }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) { return this.news.update(id, body || {}); }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.news.remove(id); }
}
