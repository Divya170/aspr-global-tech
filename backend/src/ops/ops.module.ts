import { Global, Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { NotificationsService } from './notifications.service';
import { OpsController } from './ops.controller';
import { RevalidateService } from './revalidate.service';

/** Cross-cutting services every feature module uses: audit log, notifications, website cache refresh. */
@Global()
@Module({ controllers: [OpsController], providers: [ActivityService, NotificationsService, RevalidateService], exports: [ActivityService, NotificationsService, RevalidateService] })
export class OpsModule {}
