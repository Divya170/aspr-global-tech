import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { ApplicationsAdminController, ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({ imports: [UploadsModule], controllers: [ApplicationsController, ApplicationsAdminController], providers: [ApplicationsService] })
export class CareersModule {}
