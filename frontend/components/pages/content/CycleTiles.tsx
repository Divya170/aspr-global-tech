'use client';

import type { ReactNode } from 'react';
import { useAutoCycle, useInView } from '@/components/interactive/hooks';
import './content.css';

const CYCLE = 3200;

/**
 * Icon + title + text tiles that take turns in the spotlight: the icon fills, a timer bar runs and
 * a glow follows the cursor. Hovering or focusing a tile takes over from the auto-play. Every tile
 * stays fully visible; only the emphasis moves.
 */
export function CycleTiles({ items, className = '' }: { items: { icon: ReactNode; t: string; d: string }[]; className?: string }) {
  const [ref, seen, armed] = useInView<HTMLUListElement>(0.3);
  const { active, paused, pick, resume } = useAutoCycle(items.length, seen, CYCLE);
  const glow = (e: React.PointerEvent<HTMLLIElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <ul
      ref={ref} onMouseLeave={resume} style={{ '--cycle': `${CYCLE}ms` } as React.CSSProperties}
      className={`ct-walk ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''} ${paused ? 'is-paused' : ''} ${className}`}
    >
      {items.map((it, i) => (
        <li
          key={it.t} tabIndex={0} style={{ '--i': i } as React.CSSProperties} className={`ct-walk-item ${i === active ? 'is-active' : ''}`}
          onMouseEnter={() => pick(i)} onFocus={() => pick(i)} onBlur={resume} onPointerMove={glow}
        >
          <span className="ct-walk-glow" aria-hidden="true" />
          <span className="ct-tile-icon" aria-hidden="true">{it.icon}</span>
          <div className="min-w-0 pr-6">
            <h3 className="font-sans text-base font-semibold tracking-normal text-text">{it.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{it.d}</p>
          </div>
          <span className="ct-walk-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <span className="ct-walk-bar" aria-hidden="true"><span /></span>
        </li>
      ))}
    </ul>
  );
}
