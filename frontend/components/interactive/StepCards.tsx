'use client';

import { tiltHandlers, useAutoCycle, useInView } from './hooks';
import './interactive.css';

const CYCLE = 2800;

/**
 * Numbered cards that light up in turn with a progress track. Cards tilt toward the cursor
 * with a following glow; hovering or focusing one takes over from the auto-play.
 */
export function StepCards({ items, label }: { items: { n: string; t: string; d: string }[]; label?: string }) {
  const [ref, seen, armed] = useInView<HTMLDivElement>(0.3);
  const { active, paused, pick, resume } = useAutoCycle(items.length, seen, CYCLE);
  const progress = items.length > 1 ? ((active + 1) / items.length) * 100 : 100;
  const tilt = tiltHandlers();
  return (
    <div ref={ref} className={`ix-steps ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''} ${paused ? 'is-paused' : ''}`} style={{ '--cycle': `${CYCLE}ms` } as React.CSSProperties} onMouseLeave={resume}>
      <div className="ix-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <ol className="ix-step-grid" aria-label={label}>
        {items.map((it, i) => (
          <li
            key={it.t} tabIndex={0} style={{ '--i': i } as React.CSSProperties}
            className={`ix-step ${i === active ? 'is-active' : ''} ${i < active ? 'is-done' : ''}`}
            onMouseEnter={() => pick(i)} onFocus={() => pick(i)} onBlur={resume}
            onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}
          >
            <span className="ix-glow" aria-hidden="true" />
            <span className="ix-step-num" aria-hidden="true">{it.n}</span>
            <h3 className="ix-step-title">{it.t}</h3>
            <p className="ix-step-desc">{it.d}</p>
            <span className="ix-step-bar" aria-hidden="true"><span /></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
