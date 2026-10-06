import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { assertValid } from '../common/errors';
import { str } from '../common/rules';
import { config } from '../config';
import { DatabaseService, parseJson, Row } from '../database/database.service';
import { LeadsService } from '../leads/leads.service';
import { GeminiService, GeminiTurn } from './gemini.service';
import { KnowledgeService } from './knowledge.service';

/**
 * Number of prior *messages* replayed to the model — not exchanges. Eight messages is four
 * back-and-forth turns. Named for what it counts, because a mismatch silently doubles cost.
 */
const HISTORY_MESSAGE_LIMIT = 8;
const MAX_QUESTION = 1000;

/**
 * Deterministic backstop for lead capture. The model is asked to emit a marker on buying
 * intent, but relying on that alone loses the lead whenever it forgets — and nothing happens
 * at all without an API key. Matching the visitor's own words costs nothing.
 */
const LEAD_INTENT =
  /\b(hire|quote|quotation|estimate|proposal|engage|onboard)\b|\b(start|begin|kick\s?off|commission)\s+(a|my|our|the)?\s*(project|build|work|site|website|app)\b|\b(work\s+with\s+you|get\s+in\s+touch|contact\s+me|call\s+me|email\s+me|reach\s+out|book\s+a\s+call|talk\s+to\s+someone|speak\s+to\s+(you|someone|the\s+team|the\s+founder))\b/i;

interface SessionRow { id: number; visitor_id: string }

@Injectable()
export class ChatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Chat');
  private sweeper?: NodeJS.Timeout;

  constructor(
    private readonly db: DatabaseService,
    private readonly gemini: GeminiService,
    private readonly knowledge: KnowledgeService,
    private readonly leads: LeadsService,
  ) {}

  /** Anonymous transcripts are not kept forever: expired sessions (and their messages) are swept hourly. */
  onModuleInit(): void {
    this.sweep();
    this.sweeper = setInterval(() => this.sweep(), 60 * 60 * 1000);
    this.sweeper.unref();
  }

  onModuleDestroy(): void {
    if (this.sweeper) clearInterval(this.sweeper);
  }

  private sweep(): void {
    try {
      const { changes } = this.db.run("DELETE FROM chat_sessions WHERE expires_at < datetime('now')");
      if (changes) this.logger.log(`Expired ${changes} chat session(s)`);
    } catch (err) {
      this.logger.error(`Chat sweep failed: ${(err as Error).message}`);
    }
  }

  private expiry(): string {
    return `+${Math.max(1, config.chatSessionTtlDays)} days`;
  }

  /**
   * Resolves the conversation, minting one when the visitor has no usable id. The id is an
   * opaque random string, never the row id, and an unknown id quietly starts a new session.
   */
  private getOrCreateSession(sessionId: string, context: { sourcePath: string; userAgent: string }): SessionRow {
    if (sessionId) {
      const existing = this.db.get<SessionRow>('SELECT id, visitor_id FROM chat_sessions WHERE visitor_id = ?', [sessionId]);
      if (existing) return existing;
    }
    const visitorId = randomUUID();
    const { lastInsertRowid } = this.db.run(
      `INSERT INTO chat_sessions (visitor_id, source_path, user_agent, expires_at) VALUES (?, ?, ?, datetime('now', ?))`,
      [visitorId, context.sourcePath.slice(0, 200), context.userAgent.slice(0, 300), this.expiry()],
    );
    return { id: lastInsertRowid, visitor_id: visitorId };
  }

  /** Replays the tail of the conversation in chronological order. */
  private buildHistory(sessionId: number): GeminiTurn[] {
    const rows = this.db.all<{ role: string; content: string }>(
      'SELECT role, content FROM chat_messages WHERE session_id = ? AND error_code IS NULL ORDER BY id DESC LIMIT ?',
      [sessionId, HISTORY_MESSAGE_LIMIT],
    );
    return rows.reverse().map((r) => ({ role: r.role === 'user' ? 'user' : 'model', content: r.content }));
  }

  private writeFrame(res: Response, payload: Row): void {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  /** Streams an answer to the visitor over SSE and records the exchange. */
  async streamMessage(body: Row, res: Response, context: { userAgent?: string }): Promise<void> {
    const question = str(body.question);
    if (!question) { res.status(400).json({ statusCode: 400, message: 'Type a question first.' }); return; }
    if (question.length > MAX_QUESTION) { res.status(400).json({ statusCode: 400, message: 'Question is too long — keep it under 1000 characters.' }); return; }

    const startedAt = Date.now();
    let session: SessionRow;
    try {
      session = this.getOrCreateSession(str(body.sessionId).slice(0, 64), { sourcePath: str(body.sourcePath), userAgent: context.userAgent || '' });
    } catch (err) {
      this.logger.error(`Could not open chat session: ${(err as Error).message}`);
      res.status(503).json({ statusCode: 503, message: 'Chat is unavailable right now.' });
      return;
    }

    const history = this.buildHistory(session.id);
    const { context: kbContext, sources } = this.knowledge.retrieve(question);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Without this nginx buffers the whole stream and streaming silently dies.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    this.writeFrame(res, { type: 'start', sessionId: session.visitor_id });

    // Stop paying for an answer nobody is waiting for.
    const clientGone = new AbortController();
    res.on('close', () => clientGone.abort());
    // Keeps idle proxies from dropping the connection before the first token.
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000);

    try {
      this.db.run("INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)", [session.id, question]);
    } catch (err) {
      this.logger.error(`Failed to persist question: ${(err as Error).message}`);
    }

    let answer = '';
    let pending = '';
    let leadRequested = false;
    let usage: { input: number; output: number } | null = null;
    let failed = false;

    try {
      for await (const chunk of this.gemini.streamAnswer(question, history, kbContext, clientGone.signal)) {
        if (chunk.usage) { usage = chunk.usage; continue; }
        if (!chunk.text) continue;
        pending += chunk.text;
        const { safe, tail, found } = GeminiService.stripLeadMarker(pending);
        pending = tail;
        if (found) leadRequested = true;
        if (safe) { answer += safe; this.writeFrame(res, { type: 'chunk', text: safe }); }
      }
      // Whatever was held back waiting for a possible marker.
      if (pending) { answer += pending; this.writeFrame(res, { type: 'chunk', text: pending }); }
      // Either the model asked for the form, or the visitor plainly said so.
      if (leadRequested || LEAD_INTENT.test(question)) this.writeFrame(res, { type: 'lead' });
      this.writeFrame(res, { type: 'done', sessionId: session.visitor_id, sources: sources.map((s) => ({ title: s.title, url: s.url })) });
    } catch (err) {
      failed = true;
      this.logger.error(`Chat stream failed: ${(err as Error).message}`);
      // Never return the raw error text to the browser.
      this.writeFrame(res, { type: 'error', code: 'STREAM_FAILED', message: 'Something went wrong. Please try again.' });
    } finally {
      clearInterval(heartbeat);
      res.end();
    }

    // Persisted after the response closes: off the visitor's critical path.
    try {
      this.db.run(
        `INSERT INTO chat_messages (session_id, role, content, sources, usage, latency_ms, error_code, is_fallback) VALUES (?, 'assistant', ?, ?, ?, ?, ?, ?)`,
        [session.id, answer, sources.map((s) => ({ title: s.title, url: s.url, score: s.score })), usage, Date.now() - startedAt,
          failed ? 'STREAM_FAILED' : null, !this.gemini.isConfigured || failed],
      );
      this.db.run(
        `UPDATE chat_sessions SET message_count = message_count + 2, last_message_at = datetime('now'), expires_at = datetime('now', ?) WHERE id = ?`,
        [this.expiry(), session.id],
      );
    } catch (err) {
      this.logger.error(`Failed to persist chat exchange: ${(err as Error).message}`);
    }
  }

  /**
   * Turns a chat conversation into a real lead. The leads service does the work, so chat
   * leads get the same validation, inquiry ID, notifications and emails as the quote form,
   * with the visitor's chat questions attached for context.
   */
  captureLead(body: Row, meta: { ip?: string; userAgent?: string }) {
    const sessionId = str(body.sessionId).slice(0, 64);
    const brief = str(body.brief);
    if (brief.length < 10) assertValid({ message: 'Tell us a little about what you need — at least 10 characters.' });

    const session = sessionId ? this.db.get<SessionRow>('SELECT id, visitor_id FROM chat_sessions WHERE visitor_id = ?', [sessionId]) : undefined;
    const asked = session
      ? this.db.all<{ content: string }>("SELECT content FROM chat_messages WHERE session_id = ? AND role = 'user' ORDER BY id DESC LIMIT 5", [session.id]).reverse().map((r) => r.content)
      : [];
    const message = asked.length ? `${brief}\n\n— Sent from the site chat. Questions asked:\n${asked.map((q) => `• ${q}`).join('\n')}` : `${brief}\n\n— Sent from the site chat.`;

    const types: string[] = this.knowledge.projectTypes();
    const need = str(body.need);
    const result = this.leads.create({
      projectType: types.includes(need) ? need : 'Other',
      name: body.name, email: body.email, phone: body.phone, company: body.company || '', message: message.slice(0, 5000),
    }, 'chat', [], meta) as Row;

    if (session) {
      try {
        this.db.run('UPDATE chat_sessions SET enquiry_ref = ? WHERE id = ?', [result.refNo, session.id]);
      } catch (err) {
        this.logger.warn(`Could not link lead to session: ${(err as Error).message}`);
      }
    }
    return { reference: result.refNo };
  }

  /** Recent conversations for the admin area, newest first. */
  getRecentSessions(limit = 50) {
    return this.db.all(
      `SELECT visitor_id AS visitorId, message_count AS messageCount, last_message_at AS lastMessageAt, enquiry_ref AS enquiryRef,
              source_path AS sourcePath, created_at AS createdAt
         FROM chat_sessions WHERE message_count > 0 ORDER BY last_message_at DESC LIMIT ?`, [limit]);
  }

  /** Transcript for one conversation, oldest first. Used to rehydrate the widget. */
  getMessages(sessionId: string) {
    const session = this.db.get<SessionRow>("SELECT id, visitor_id FROM chat_sessions WHERE visitor_id = ? AND expires_at >= datetime('now')", [str(sessionId)]);
    if (!session) return [];
    return this.db
      .all<Row>('SELECT role, content, sources, created_at FROM chat_messages WHERE session_id = ? AND error_code IS NULL ORDER BY id', [session.id])
      .map((r) => ({ role: r.role, content: r.content, sources: parseJson(r.sources, []), createdAt: r.created_at }));
  }
}
