import { Fragment, type ReactNode } from 'react';
import { Check, Lightbulb, Quote, Zap } from 'lucide-react';
import type { Block } from '@/lib/types';
import '@/components/pages/content/content.css';

/** One item per non-empty line. */
const lines = (text: string) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** Turns plain email addresses and http(s) URLs in CMS text into links. Everything else stays text. */
function linkify(text: string): ReactNode {
  const parts = text.split(/((?:https?:\/\/[^\s)]+[^\s).,;:])|(?:[\w.+-]+@[\w-]+(?:\.[\w-]+)+))/g);
  return parts.map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    if (part.includes('@') && !part.startsWith('http')) return <a key={i} href={`mailto:${part}`}>{part}</a>;
    return <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>;
  });
}

export const blockId = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** The h2 blocks as table-of-contents entries (same ids the headings get below). */
export const headings = (blocks: Block[]) =>
  blocks.filter((b) => b.type === 'h2' && (b.text || '').trim()).map((b) => ({ id: blockId(b.text.trim()), label: b.text.trim() }));

/**
 * Renders CMS content blocks (articles, legal pages) as long-form text. `.prose-aspr` is applied
 * here so callers only choose the width. `numbered` prefixes each h2 with 01, 02… (CSS counters,
 * so the numbers stay out of the heading text).
 */
export function Blocks({ blocks, className = '', numbered = false }: { blocks: Block[]; className?: string; numbered?: boolean }) {
  return (
    <div className={`prose-aspr ct-prose ${numbered ? 'ct-numbered' : ''} ${className}`}>
      {blocks.map((b, i) => {
        const text = (b.text || '').trim();
        if (!text) return null;
        switch (b.type) {
          case 'standfirst':
            return <p key={i} className="ct-lede text-lg leading-relaxed text-text sm:text-xl">{linkify(text)}</p>;
          case 'h2':
            return <h2 key={i} id={blockId(text)} className="scroll-mt-28">{text}</h2>;
          case 'quote':
            return <blockquote key={i} className="ct-quote my-12!"><Quote aria-hidden="true" className="ct-quote-mark" />{linkify(text)}</blockquote>;
          case 'takeaways':
            return (
              <aside key={i} aria-label="Key takeaways" className="ct-takeaways my-10! sm:p-9!">
                <p className="eyebrow flex items-center gap-2"><Zap aria-hidden="true" size={15} />Key takeaways</p>
                <ul className="mt-4">{lines(text).map((l, j) => <li key={j}>{linkify(l)}</li>)}</ul>
              </aside>
            );
          case 'list':
            return <ul key={i}>{lines(text).map((l, j) => <li key={j}>{linkify(l)}</li>)}</ul>;
          case 'checklist':
            return (
              <ul key={i} className="ct-check">
                {lines(text).map((l, j) => (
                  <li key={j}>
                    <span aria-hidden="true" className="ct-check-icon"><Check size={15} strokeWidth={2.4} /></span>
                    <span>{linkify(l)}</span>
                  </li>
                ))}
              </ul>
            );
          case 'callout':
            return (
              <aside key={i} className="ct-callout my-10!">
                <span aria-hidden="true" className="ct-callout-icon"><Lightbulb size={18} /></span>
                <p className="self-center text-text">{linkify(text)}</p>
              </aside>
            );
          default:
            return <p key={i}>{linkify(text)}</p>;
        }
      })}
    </div>
  );
}

/** SQLite "YYYY-MM-DD HH:MM:SS" (UTC) → Date, or null if it can't be parsed. */
export function dbDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2} /.test(s) ? `${s.replace(' ', 'T')}Z` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
