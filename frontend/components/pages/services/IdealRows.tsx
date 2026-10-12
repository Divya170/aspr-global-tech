'use client';

import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { useAutoCycle, useInView } from '@/components/interactive/hooks';
import '@/components/interactive/interactive.css';
import './services.css';

/** "Who this is for" as big rows that slide in and highlight in turn; hover or focus picks one. */
export function IdealRows({ items, cycle = 2400 }: { items: string[]; cycle?: number }) {
  const [ref, seen, armed] = useInView<HTMLUListElement>(0.25);
  const { active, pick, resume } = useAutoCycle(items.length, seen, cycle);
  return (
    <ul ref={ref} onMouseLeave={resume} className={`ix-rows svx-ideal ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''}`}>
      {items.map((x, i) => (
        <li
          key={x} tabIndex={0} style={{ '--i': i } as CSSProperties}
          className={`ix-row ${seen && i === active ? 'is-on' : ''}`}
          onMouseEnter={() => pick(i)} onFocus={() => pick(i)} onBlur={resume}
        >
          <span className="ix-row-n">0{i + 1}</span>
          <span className="ix-row-t">{x}<Check aria-hidden="true" size={20} strokeWidth={2.2} className="ix-row-arrow shrink-0" /></span>
        </li>
      ))}
    </ul>
  );
}
