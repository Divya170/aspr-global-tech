'use client';

import { useInView } from './hooks';
import './interactive.css';

/** "What's included" tiles: pop in one after another, the tick draws itself, hover lifts and glows. */
export function DeliverableTiles({ items }: { items: string[] }) {
  const [ref, seen, armed] = useInView<HTMLUListElement>(0.2);
  const glow = (e: React.PointerEvent<HTMLLIElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <ul ref={ref} className={`ix-deliver ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''}`}>
      {items.map((d, i) => (
        <li key={d} className="ix-dtile" style={{ '--i': i } as React.CSSProperties} onPointerMove={glow}>
          <span className="ix-check" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="pr-6 pt-1 text-[0.95rem] leading-snug text-text">{d}</span>
          <span className="ix-dnum" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        </li>
      ))}
    </ul>
  );
}
