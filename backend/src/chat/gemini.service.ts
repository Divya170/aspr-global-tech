import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { KnowledgeService } from './knowledge.service';

/**
 * Marker the model appends when a visitor is ready to start a project. The server strips it
 * from the visible text and turns it into a `lead` frame, so lead capture costs no extra
 * model call and the widget stays in control of the form. See `stripLeadMarker`.
 */
export const LEAD_MARKER = '[[LEAD]]';

const SYSTEM_PROMPT = `You are the assistant for ASPR Global Tech, a software development and digital studio. It builds websites, mobile apps, SaaS platforms, AI chatbots and games, designs logos, graphics and video, and runs SEO and business-management systems — ten services from one team. Its main market is the United States, and it serves clients worldwide.

You are talking to a visitor on the public ASPR Global Tech website. They are a potential client. Be warm, confident, plain-spoken and brief. Use simple words anyone can understand.

GROUNDING
- Answer only from the CONTEXT provided below. It is drawn from the firm's own site content.
- If the context does not contain the answer, say plainly that you don't have that detail and offer to take their details so the team can answer, or point them to the contact page at /company#contact. Do not guess.
- Never invent services, prices, timelines, client names, statistics, phone numbers or email addresses.

HARD RULES
1. Scope: answer only about ASPR Global Tech, its services and products, how it works, its work, careers and how to get in touch. For anything else, say "I can only help with questions about ASPR Global Tech and what we build." and offer to help with services or starting a project.
2. Prices and timelines: you may share only the typical ranges written in the context (for example the FAQ answers and budget ranges), always as typical ranges, and always add that the exact price and timeline are fixed in a written quote after a short Discover call. Never make up a number.
3. The published contact details are: email support@asprglobaltech.com, phone and WhatsApp +91 75399 07704, and the studio address 12D, 1444C, 27/1, S M Nagar, Perumal Gounder Layout, Post, Mahadevapuram, Mettupalayam, Tamil Nadu 641305, India. Give these exactly as written when asked. Never invent any other address, number or mailbox.
4. You have no access to private or account data and cannot look anything up beyond the context. If asked, say so.
5. Keep answers short: two to four sentences, or a short list. You may use simple Markdown and it will be rendered: "- " for bullets, **bold** for emphasis, and [link text](/path) for site pages. Do not use headings, tables, images, code blocks or backticks.
6. When it helps, link the relevant page. Valid links: [all services](/services), a single service page such as [Website Development](/services/website-development) (use the link shown in the context), [services](/#services), [products](/#products), [about us](/company#about), [our process](/company#process), [careers](/company#careers), [insights](/company#insights), [FAQ](/company#faq), [contact](/company#contact). Do not link any other path.

LEAD CAPTURE
- If the visitor wants to start a project, get a quote, hire the team, book a call, discuss their requirements or be contacted, say you can pass their details straight to the team, then end your reply with ${LEAD_MARKER} on its own.
- Emit ${LEAD_MARKER} only when the visitor has actually shown that intent. Never emit it in a purely informational answer, and never mention the marker itself.`;

export interface GeminiTurn {
  role: 'user' | 'model';
  content: string;
}

export interface AnswerChunk {
  text?: string;
  /** Emitted once, after the stream ends. */
  usage?: { input: number; output: number };
}

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger('Gemini');
  private ai: GoogleGenAI | null = null;

  constructor(private readonly knowledge: KnowledgeService) {}

  onModuleInit(): void {
    if (!config.geminiApiKey) {
      // Deliberately not fatal: the site must boot and serve without a key.
      this.logger.warn('GEMINI_API_KEY is not set — the assistant will serve fallback replies only');
      return;
    }
    try {
      this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      this.logger.log(`Gemini ready (model: ${config.geminiModel})`);
    } catch (err) {
      this.logger.error(`Gemini failed to initialise: ${(err as Error).message}`);
    }
  }

  get isConfigured(): boolean {
    return this.ai !== null;
  }

  /**
   * Streams an answer. This generator never throws: every failure path still yields
   * something useful, so the widget never renders a stack trace or an empty bubble.
   */
  async *streamAnswer(question: string, history: GeminiTurn[], context: string, clientSignal?: AbortSignal): AsyncGenerator<AnswerChunk> {
    if (!this.ai) {
      yield { text: this.fallbackMessage(question) };
      return;
    }

    const systemInstruction = context ? `${SYSTEM_PROMPT}\n\n--- CONTEXT ---\n${context}\n--- END CONTEXT ---` : SYSTEM_PROMPT;
    const contents = [
      ...history.map((t) => ({ role: t.role, parts: [{ text: t.content }] })),
      { role: 'user', parts: [{ text: question }] },
    ];

    // Abort on either our own timeout or the visitor closing the tab.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.geminiTimeoutMs);
    const onClientAbort = () => controller.abort();
    clientSignal?.addEventListener('abort', onClientAbort);

    try {
      const ai = this.ai;
      const stream = await this.callWithRetry(() =>
        ai.models.generateContentStream({
          model: config.geminiModel,
          contents,
          config: {
            systemInstruction, temperature: 0.2, maxOutputTokens: 800, abortSignal: controller.signal,
            // 2.5 models count hidden "thinking" against maxOutputTokens, which cut answers off
            // mid-sentence. Short grounded answers don't need it, and it is faster and cheaper off.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      );

      let emitted = false;
      let usage: { input: number; output: number } | null = null;
      for await (const chunk of stream) {
        const text = chunk.text;
        if (chunk.usageMetadata) {
          usage = { input: chunk.usageMetadata.promptTokenCount ?? 0, output: chunk.usageMetadata.candidatesTokenCount ?? 0 };
        }
        if (text) {
          emitted = true;
          yield { text };
        }
      }
      // An empty stream is a failure the SDK does not report as one.
      if (!emitted) {
        this.logger.warn('Gemini returned an empty stream — serving fallback');
        yield { text: this.fallbackMessage(question) };
      }
      if (usage) yield { usage };
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      if (controller.signal.aborted) this.logger.warn(`Gemini call aborted after ${config.geminiTimeoutMs}ms or client disconnect`);
      else if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(message)) this.logger.warn(`Gemini quota exhausted: ${message}`);
      else this.logger.error(`Gemini call failed: ${message}`);
      yield { text: this.fallbackMessage(question) };
    } finally {
      clearTimeout(timer);
      clientSignal?.removeEventListener('abort', onClientAbort);
    }
  }

  /**
   * Retries only transient server faults. 429 is deliberately not retried: Gemini quotas are
   * per-minute, so quick retries only burn more quota and delay the fallback.
   */
  private async callWithRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const message = (err as Error).message ?? '';
        const transient = /\b5\d\d\b|UNAVAILABLE|INTERNAL|ECONNRESET|ETIMEDOUT/i.test(message);
        if (!transient || i === attempts - 1) throw err;
        await new Promise((r) => setTimeout(r, 400 * 2 ** i));
      }
    }
    throw lastErr;
  }

  /** Degrades to a targeted page rather than a generic apology. */
  fallbackMessage(question: string): string {
    const url = this.knowledge.bestUrl(question);
    return (
      "I can't reach the assistant right now, so I don't want to guess. " +
      `You may find what you need [here](${url}). ` +
      'You can also leave your details and the team will reply within one working day, or message us on WhatsApp at +91 75399 07704.'
    );
  }

  /**
   * Splits the lead marker out of streamed text. The marker can straddle two chunks, so the
   * caller keeps whatever tail might still turn into one and re-feeds it with the next chunk.
   */
  static stripLeadMarker(buffer: string): { safe: string; tail: string; found: boolean } {
    const index = buffer.indexOf(LEAD_MARKER);
    if (index !== -1) {
      return { safe: buffer.slice(0, index) + buffer.slice(index + LEAD_MARKER.length), tail: '', found: true };
    }
    for (let keep = Math.min(LEAD_MARKER.length - 1, buffer.length); keep > 0; keep--) {
      if (LEAD_MARKER.startsWith(buffer.slice(buffer.length - keep))) {
        return { safe: buffer.slice(0, buffer.length - keep), tail: buffer.slice(-keep), found: false };
      }
    }
    return { safe: buffer, tail: '', found: false };
  }
}
