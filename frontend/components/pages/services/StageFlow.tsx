'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useAutoCycle, useInView } from '@/components/interactive/hooks';
import './services.css';

const CYCLE = 3400;

export interface Stage { key: string | number; icon?: ReactNode; label: string; verb: string; sum: string; steps: { id: number; num: string; title: string }[] }

/**
 * The project stages as a connected flow: the active stage lifts and glows, its steps light up,
 * a timer bar runs along its base and the connector to the next stage fills. Auto-plays once in
 * view; hover or focus picks a stage.
 */
export function StageFlow({ stages }: { stages: Stage[] }) {
  const [ref, seen, armed] = useInView<HTMLOListElement>(0.25);
  const { active, paused, pick, resume } = useAutoCycle(stages.length, seen, CYCLE);
  const glow = (e: React.PointerEvent<HTMLLIElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <ol
      ref={ref} onMouseLeave={resume}
      className={`svx-flow ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''} ${paused ? 'is-paused' : ''}`}
      style={{ '--n': stages.length, '--cycle': `${CYCLE}ms` } as CSSProperties}
    >
      {stages.map((g, i) => (
        <li
          key={g.key} tabIndex={0} style={{ '--i': i } as CSSProperties}
          className={`svx-stage ${seen && i === active ? 'is-active' : ''} ${seen && i < active ? 'is-done' : ''}`}
          onMouseEnter={() => pick(i)} onFocus={() => pick(i)} onBlur={resume} onPointerMove={glow}
        >
          <span className="svx-stage-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          {g.icon && <span className="svx-stage-icon" aria-hidden="true">{g.icon}</span>}
          <p className={`${g.icon ? 'mt-7' : ''} font-mono text-xs uppercase tracking-[0.14em] text-subtle`}>{g.label}</p>
          <h3 className="svx-stage-verb mt-4 font-display text-3xl font-semibold text-text">{g.verb}</h3>
          <p className="mt-3 flex-1 leading-relaxed text-muted">{g.sum}</p>
          {g.steps.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
              {g.steps.map((s, j) => (
                <li key={s.id} style={{ '--j': j } as CSSProperties} className="svx-stage-chip rounded-full border border-line-strong px-3 py-1 text-xs text-muted">
                  <span className="font-mono text-subtle">{s.num}</span> {s.title}
                </li>
              ))}
            </ul>
          )}
          <span className="svx-stage-bar" aria-hidden="true"><span /></span>
          {i < stages.length - 1 && <span className="svx-link" aria-hidden="true"><span /></span>}
        </li>
      ))}
    </ol>
  );
}
