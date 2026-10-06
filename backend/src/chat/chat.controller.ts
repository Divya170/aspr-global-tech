import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminGuard } from '../admin/admin.guard';
import { Perm } from '../admin/permissions';
import { clientIp, RateLimitGuard } from '../common/rate-limit.guard';
import { Row } from '../database/database.service';
import { CHAT_CONFIG } from './chat.config';
import { ChatService } from './chat.service';
import { KnowledgeService } from './knowledge.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService, private readonly knowledge: KnowledgeService) {}

  /**
   * Public streaming endpoint. Every call costs a Gemini request, so it is throttled well
   * below the form limits. `@Res()` hands the socket to the service for Server-Sent Events.
   */
  @Post('message')
  @UseGuards(new RateLimitGuard('chat', 15, 60_000))
  message(@Body() body: Row, @Req() req: Request, @Res() res: Response) {
    return this.chat.streamMessage(body || {}, res, { userAgent: req.headers['user-agent'] });
  }

  /** Greeting, starter prompts and the "what do you need" options. Cheap to call on mount. */
  @Get('config')
  config() {
    return { ...CHAT_CONFIG, needs: this.knowledge.projectTypes() };
  }

  /** Turns a conversation into a real enquiry. Matches the contact form's limit. */
  @Post('lead')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(new RateLimitGuard('chat-lead', 5, 10 * 60_000))
  lead(@Body() body: Row, @Req() req: Request) {
    return this.chat.captureLead(body || {}, { ip: clientIp(req), userAgent: req.headers['user-agent'] });
  }

  /**
   * Transcript for one conversation. The session id is an unguessable random token and the
   * only thing that grants access — there is no account to scope by.
   */
  @Get('sessions/:sessionId/messages')
  @UseGuards(new RateLimitGuard('chat-history', 30, 60_000))
  messages(@Param('sessionId') sessionId: string) {
    return this.chat.getMessages(sessionId);
  }
}

/** Admin: recent conversations and their transcripts. */
@Controller('admin/chat')
@UseGuards(AdminGuard)
@Perm('chat')
export class ChatAdminController {
  constructor(private readonly chat: ChatService) {}

  @Get('sessions')
  sessions() {
    return this.chat.getRecentSessions();
  }

  @Get('sessions/:sessionId/messages')
  transcript(@Param('sessionId') sessionId: string) {
    return this.chat.getMessages(sessionId);
  }
}
