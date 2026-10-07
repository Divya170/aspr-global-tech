import { Fragment, type ReactNode } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import type { Block } from '@/lib/types';

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

/**
 * Renders CMS content blocks (articles, legal pages) as long-form text. Wrap in `.prose-aspr`
 * is applied here so callers only choose the width.
 */
export function Blocks({ blocks, className = '' }: { blocks: Block[]; className?: string }) {
  return (
    <div className={`prose-aspr ${className}`}>
      {blocks.map((b, i) => {
        const text = (b.text || '').trim();
        if (!text) return null;
        switch (b.type) {
          case 'standfirst':
            return <p key={i} className="text-lg leading-relaxed text-text sm:text-xl">{linkify(text)}</p>;
          case 'h2':
            return <h2 key={i} id={blockId(text)} className="scroll-mt-28">{text}</h2>;
          case 'quote':
            return <blockquote key={i} className="my-10!">{linkify(text)}</blockquote>;
          case 'takeaways':
            return (
              <aside key={i} aria-label="Key takeaways" className="panel my-10! p-6 sm:p-8">
                <p className="eyebrow">Key takeaways</p>
                <ul className="mt-4">{lines(text).map((l, j) => <li key={j}>{linkify(l)}</li>)}</ul>
              </aside>
            );
          case 'list':
            return <ul key={i}>{lines(text).map((l, j) => <li key={j}>{linkify(l)}</li>)}</ul>;
          case 'checklist':
            return (
              <ul key={i} className="space-y-3">
                {lines(text).map((l, j) => (
                  <li key={j} className="flex gap-3 pl-0! before:hidden!">
                    <CheckCircle2 aria-hidden="true" size={20} className="mt-1 shrink-0 text-success" />
                    <span>{linkify(l)}</span>
                  </li>
                ))}
              </ul>
            );
          case 'callout':
            return (
              <aside key={i} className="my-10! flex gap-4 rounded-2xl border border-brand/30 bg-brand/[0.07] p-5 sm:p-6">
                <Info aria-hidden="true" size={20} className="mt-1 shrink-0 text-brand-soft" />
                <p className="text-text">{linkify(text)}</p>
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
