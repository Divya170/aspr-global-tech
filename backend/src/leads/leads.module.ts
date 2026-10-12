import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { UploadsModule } from '../uploads/uploads.module';
import { LeadsAdminController, LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({ imports: [ContentModule, UploadsModule], controllers: [LeadsController, LeadsAdminController], providers: [LeadsService], exports: [LeadsService] })
export class LeadsModule {}
