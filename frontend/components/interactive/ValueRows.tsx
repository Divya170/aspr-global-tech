'use client';

import { ArrowUpRight } from 'lucide-react';
import { useAutoCycle, useInView } from './hooks';
import './interactive.css';

/**
 * Large rows that highlight in turn: a colour sweep, the outlined number fills, the title
 * slides and an arrow appears. Hover or focus picks a row.
 */
export function ValueRows({ items, cycle = 2600, label }: { items: { n?: string; t: string; d: string }[]; cycle?: number; label?: string }) {
  const [ref, seen, armed] = useInView<HTMLOListElement>(0.25);
  const { active, pick, resume } = useAutoCycle(items.length, seen, cycle);
  return (
    <ol ref={ref} aria-label={label} className={`ix-rows ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''}`} onMouseLeave={resume}>
      {items.map((it, i) => (
        <li
          key={it.t} tabIndex={0} style={{ '--i': i } as React.CSSProperties}
          className={`ix-row ${i === active ? 'is-on' : ''}`}
          onMouseEnter={() => pick(i)} onFocus={() => pick(i)} onBlur={resume}
        >
          <span className="ix-row-n" aria-hidden="true">{it.n ?? String(i + 1).padStart(2, '0')}</span>
          <h3 className="ix-row-t">{it.t}<ArrowUpRight aria-hidden="true" size={22} className="ix-row-arrow" /></h3>
          <p className="ix-row-d">{it.d}</p>
        </li>
      ))}
    </ol>
  );
}
