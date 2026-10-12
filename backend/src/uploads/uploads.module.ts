import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { MediaAdminController, MediaPublicController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  controllers: [AttachmentsController, MediaAdminController, MediaPublicController],
  providers: [AttachmentsService, MediaService],
  exports: [AttachmentsService, MediaService],
})
export class UploadsModule {}
