'use client';

import type { CSSProperties } from 'react';
import { useInView } from '@/components/interactive/hooks';
import './forms.css';

/**
 * Numbered "what happens next" list as a vertical stepper: once in view, the nodes light up in
 * turn and the rail between them fills. Fully visible without JS and for reduced motion.
 */
export function NextStepper({ items, cards = false, className = '' }: { items: { t: string; d: string }[]; cards?: boolean; className?: string }) {
  const [ref, seen, armed] = useInView<HTMLOListElement>(0.3);
  return (
    <ol
      ref={ref}
      className={`fm-next ${cards ? 'fm-next-cards' : ''} ${armed ? 'is-armed' : ''} ${seen ? 'is-seen' : ''} ${className}`}
      style={{ '--gap': cards ? '1rem' : '1.25rem' } as CSSProperties}
    >
      {items.map((x, i) => (
        <li key={x.t} style={{ '--i': i } as CSSProperties}>
          <span aria-hidden="true" className="fm-next-num">{i + 1}</span>
          <div className="fm-next-body">
            <p className="text-sm font-medium text-text">{x.t}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{x.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
