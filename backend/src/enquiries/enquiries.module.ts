import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { UploadsModule } from '../uploads/uploads.module';
import { EnquiriesAdminController, EnquiriesController } from './enquiries.controller';
import { EnquiriesService } from './enquiries.service';

@Module({ imports: [ContentModule, UploadsModule], controllers: [EnquiriesController, EnquiriesAdminController], providers: [EnquiriesService], exports: [EnquiriesService] })
export class EnquiriesModule {}
