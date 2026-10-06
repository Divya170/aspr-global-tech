import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * In-memory knowledge base for the site assistant.
 *
 * Two kinds of document feed it:
 *  - hand-written Markdown in `./kb` (story, contact, how the assistant should talk about the firm);
 *  - documents generated from the live content tables (services, FAQs, packages…), so answers
 *    follow whatever is edited in the admin dashboard. See KnowledgeService.
 *
 * Retrieval is weighted keyword scoring, not embeddings. At this corpus size that is instant,
 * free and accurate enough, which keeps the answer path to exactly one Gemini request.
 */

/** Words too common to carry meaning; dropped before scoring. */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'could',
  'did', 'do', 'does', 'for', 'from', 'get', 'had', 'has', 'have', 'how', 'i',
  'if', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'so',
  'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they',
  'this', 'to', 'up', 'us', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your', 'am', 'about',
  'want', 'need', 'like', 'please', 'tell', 'give', 'know', 'help',
]);

export interface KbDoc {
  /** Stable id, e.g. `company/about` or `services/seo`. */
  name: string;
  title: string;
  /** Site link this doc describes, e.g. `/services` or `/faq`. */
  url: string;
  content: string;
  /** Lowercased content, cached so scoring never re-lowercases per term. */
  haystack: string;
  /** Lowercased `## Related terms` block: hand-picked synonyms, scored above body mentions. */
  terms: string;
}

export interface KbHit extends KbDoc {
  score: number;
}

export function makeDoc(name: string, title: string, url: string, content: string): KbDoc {
  return {
    name, title, url, content,
    haystack: content.toLowerCase(),
    terms: (content.match(/##\s+Related terms\s*\n([\s\S]*)$/i)?.[1] ?? '').toLowerCase(),
  };
}

export class KbStore {
  private readonly logger = new Logger('KnowledgeBase');
  private fileDocs: KbDoc[] = [];
  private liveDocs: KbDoc[] = [];

  get size(): number {
    return this.fileDocs.length + this.liveDocs.length;
  }

  /** `./kb` sits next to this file in src (dev) and is copied beside it in dist (build). */
  private findKbDir(): string | null {
    const candidates = [
      path.join(__dirname, 'kb'),
      path.join(process.cwd(), 'dist', 'chat', 'kb'),
      path.join(process.cwd(), 'src', 'chat', 'kb'),
    ];
    return candidates.find((dir) => fs.existsSync(dir)) ?? null;
  }

  private collect(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) this.collect(full, out);
      else if (entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') out.push(full);
    }
    return out;
  }

  /** Reads `title:` / `url:` from front matter, falling back to the first H1. */
  private parseFrontMatter(raw: string): { title: string | null; url: string | null } {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return { title: null, url: null };
    const title = match[1].match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? null;
    const url = match[1].match(/^url:\s*(.+)$/m)?.[1]?.trim() ?? null;
    return { title, url };
  }

  /** Loads the hand-written Markdown. Safe to call again to hot-reload. */
  loadFiles(): number {
    const dir = this.findKbDir();
    if (!dir) {
      this.logger.error('Knowledge base directory not found — answers will rely on live content only');
      return 0;
    }
    this.fileDocs = this.collect(dir).map((file) => {
      const raw = fs.readFileSync(file, 'utf8');
      const name = path.relative(dir, file).replace(/\.md$/, '').split(path.sep).join('/');
      const { title, url } = this.parseFrontMatter(raw);
      return makeDoc(name, title ?? raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? name, url ?? '/', raw);
    });
    return this.fileDocs.length;
  }

  /** Replaces the documents generated from the database. */
  setLiveDocs(docs: KbDoc[]): void {
    this.liveDocs = docs;
  }

  private tokenize(query: string): string[] {
    const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOPWORDS.has(t));
    // "us" is a stopword, but a capitalised "US"/"U.S."/"USA" means the country.
    if (/\bU\.?S\.?A?\b/.test(query)) terms.push('usa', 'international');
    return [...new Set(terms)];
  }

  /**
   * Scores every document against the query and returns the best `limit` hits.
   * A match in the doc id outweighs the title, which outweighs body text. Per-term body
   * hits are capped so one word repeated many times cannot dominate ranking.
   */
  search(query: string, limit = 3): KbHit[] {
    const terms = this.tokenize(query);
    if (!terms.length) return [];
    const wordRes = terms.map((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'));

    const hits: KbHit[] = [];
    for (const doc of [...this.fileDocs, ...this.liveDocs]) {
      let score = 0;
      const lowerName = doc.name.toLowerCase();
      const lowerTitle = doc.title.toLowerCase();
      terms.forEach((term, i) => {
        if (lowerName.includes(term)) score += 10;
        if (lowerTitle.includes(term)) score += 8;
        wordRes[i].lastIndex = 0;
        if (wordRes[i].test(doc.terms)) score += 6;
        const occurrences = doc.haystack.match(wordRes[i])?.length ?? 0;
        if (occurrences) score += Math.min(occurrences, 5);
      });
      if (score > 0) hits.push({ ...doc, score });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /** Best-matching page link, used by the fallback message. */
  bestUrl(query: string): string {
    return this.search(query, 1)[0]?.url ?? '/services';
  }
}
