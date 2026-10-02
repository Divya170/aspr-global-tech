import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { ContentModule } from '../content/content.module';
import { EnquiriesModule } from '../enquiries/enquiries.module';
import { ChatAdminController, ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GeminiService } from './gemini.service';
import { KnowledgeService } from './knowledge.service';

// Chat leads are ordinary enquiries; the existing service does the work.
@Module({ imports: [AdminModule, ContentModule, EnquiriesModule], controllers: [ChatController, ChatAdminController], providers: [ChatService, GeminiService, KnowledgeService] })
export class ChatModule {}
