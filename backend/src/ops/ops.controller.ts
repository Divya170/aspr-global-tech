import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from '../admin/admin.guard';
import { Perm } from '../admin/permissions';
import { ActivityService } from './activity.service';
import { NotificationsService } from './notifications.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class OpsController {
  constructor(private readonly notifications: NotificationsService, private readonly activity: ActivityService) {}

  @Get('notifications')
  list(@Req() req: Request) {
    return this.notifications.forUser(req.user!.id);
  }

  @Post('notifications/read')
  @HttpCode(200)
  read(@Body() body: { ids?: unknown }, @Req() req: Request) {
    if (body?.ids === 'all') this.notifications.markAllRead(req.user!.id);
    else this.notifications.markRead(req.user!.id, Array.isArray(body?.ids) ? body.ids.map(Number) : []);
    return this.notifications.forUser(req.user!.id);
  }

  @Get('activity')
  @Perm('activity')
  log(@Query() q: Record<string, string>) {
    return this.activity.list({ entity: q.entity, entityId: Number(q.entityId) || undefined, userId: Number(q.userId) || undefined, page: Number(q.page), pageSize: Number(q.pageSize) });
  }
}
