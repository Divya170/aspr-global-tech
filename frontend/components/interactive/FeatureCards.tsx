'use client';

import { Icon } from '@/components/ui/Icon';
import './interactive.css';

/** Icon + title + text items: the card slides, a soft glow follows the cursor and the icon fills. */
export function FeatureCards({ items, className = '' }: { items: { icon: string; t: string; d: string }[]; className?: string }) {
  const glow = (e: React.PointerEvent<HTMLLIElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <ul className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {items.map((it, i) => (
        <li key={it.t} className="ix-feature reveal" style={{ '--reveal-shift': `${(i % 3) * 2}%` } as React.CSSProperties} onPointerMove={glow}>
          <span className="ix-feature-icon" aria-hidden="true"><Icon name={it.icon} size={20} strokeWidth={1.7} /></span>
          <div className="relative">
            <h3 className="font-sans text-base font-semibold tracking-normal text-text">{it.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{it.d}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
