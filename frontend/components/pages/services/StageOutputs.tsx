'use client';

import type { CSSProperties } from 'react';
import { useInView } from '@/components/interactive/hooks';
import './services.css';

/**
 * What each stage hands over: one row per stage with a sticky outlined numeral that fills with
 * colour as the row arrives, and a checklist whose ticks draw themselves in.
 */
export function StageOutputs({ stages }: { stages: { key: string | number; label: string; items: string[] }[] }) {
  return <div>{stages.map((s, i) => <OutputRow key={s.key} n={i + 1} label={s.label} items={s.items} />)}</div>;
}

function OutputRow({ n, label, items }: { n: number; label: string; items: string[] }) {
  const [ref, seen, armed] = useInView<HTMLDivElement>(0.2);
  return (
    <div ref={ref} className={`svx-out-row ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''}`}>
      <div className="svx-out-head">
        <span className="svx-out-num" aria-hidden="true">{String(n).padStart(2, '0')}</span>
        <h3 className="eyebrow text-subtle!">{label}</h3>
      </div>
      <ul className="svx-out-list">
        {items.map((o, i) => (
          <li key={o} className="svx-out-item" style={{ '--i': i } as CSSProperties}>
            <span className="svx-out-check" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            {o}
          </li>
        ))}
      </ul>
    </div>
  );
}
