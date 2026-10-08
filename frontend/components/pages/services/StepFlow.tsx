'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useAutoCycle, useInView } from '@/components/interactive/hooks';
import './services.css';

const CYCLE = 2800;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Steps in a row joined by a connector: once in view the active step turns into a glowing card,
 * its connector fills like a timer and finished steps stay lit. Hover or focus picks a step.
 */
export function StepFlow({ items, label, cycle = CYCLE }: { items: { icon?: ReactNode; label?: string; t: string; d: string }[]; label?: string; cycle?: number }) {
  const [ref, seen, armed] = useInView<HTMLOListElement>(0.3);
  const { active, paused, pick, resume } = useAutoCycle(items.length, seen, cycle);
  const glow = (e: React.PointerEvent<HTMLLIElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <ol
      ref={ref} aria-label={label} onMouseLeave={resume}
      className={`svx-stepper ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''} ${paused ? 'is-paused' : ''}`}
      style={{ '--n': items.length, '--cycle': `${cycle}ms` } as CSSProperties}
    >
      {items.map((it, i) => (
        <li
          key={it.t} tabIndex={0} style={{ '--i': i } as CSSProperties}
          className={`svx-step ${seen && i === active ? 'is-active' : ''} ${seen && i < active ? 'is-done' : ''}`}
          onMouseEnter={() => pick(i)} onFocus={() => pick(i)} onBlur={resume} onPointerMove={glow}
        >
          <span className="svx-line" aria-hidden="true"><span /></span>
          <span className="svx-node" aria-hidden="true" />
          <span className="svx-step-n" aria-hidden="true">{pad(i + 1)}</span>
          {it.icon && <span className="svx-step-icon" aria-hidden="true">{it.icon}</span>}
          {it.label && <p className={`${it.icon ? 'mt-6' : ''} font-mono text-xs text-brand-soft`}>{it.label}</p>}
          <h3 className={`svx-step-t ${it.label ? 'mt-3' : it.icon ? 'mt-6' : ''}`}>{it.t}</h3>
          <p className="svx-step-d">{it.d}</p>
        </li>
      ))}
    </ol>
  );
}
