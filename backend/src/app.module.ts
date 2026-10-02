import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { CareersModule } from './careers/careers.module';
import { ChatModule } from './chat/chat.module';
import { ContentModule } from './content/content.module';
import { DatabaseModule } from './database/database.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [DatabaseModule, AdminModule, UploadsModule, ContentModule, EnquiriesModule, CareersModule, NewsletterModule, ChatModule],
})
export class AppModule {}
