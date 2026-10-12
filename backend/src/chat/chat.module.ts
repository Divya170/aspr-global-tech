import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { ContentModule } from '../content/content.module';
import { LeadsModule } from '../leads/leads.module';
import { ChatAdminController, ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GeminiService } from './gemini.service';
import { KnowledgeService } from './knowledge.service';

// Chat leads are ordinary leads; the leads service does the work.
@Module({ imports: [AdminModule, ContentModule, LeadsModule], controllers: [ChatController, ChatAdminController], providers: [ChatService, GeminiService, KnowledgeService] })
export class ChatModule {}
