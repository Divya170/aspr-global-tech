import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { CareersModule } from './careers/careers.module';
import { ChatModule } from './chat/chat.module';
import { ContentModule } from './content/content.module';
import { DatabaseModule } from './database/database.module';
import { LeadsModule } from './leads/leads.module';
import { MailModule } from './mail/mail.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { OpsModule } from './ops/ops.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [DatabaseModule, MailModule, OpsModule, AdminModule, UploadsModule, ContentModule, LeadsModule, CareersModule, NewsletterModule, ChatModule],
})
export class AppModule {}
