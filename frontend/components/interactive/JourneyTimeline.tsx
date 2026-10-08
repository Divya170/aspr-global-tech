'use client';

import { useInView } from './hooks';
import './interactive.css';

/**
 * A horizontal (vertical on phones) timeline: the rail fills up to "Now", dots pop in turn,
 * the current step pings and the future step shimmers.
 */
export function JourneyTimeline({ items }: { items: { k: string; t: string }[] }) {
  const [ref, seen, armed] = useInView<HTMLDivElement>(0.3);
  const nowIdx = Math.max(0, items.findIndex((x) => x.k.toLowerCase() === 'now'));
  return (
    <div ref={ref} className={`ix-journey ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''}`} style={{ '--n': items.length, '--now': nowIdx } as React.CSSProperties}>
      <div className="ix-rail" aria-hidden="true"><span className="ix-rail-fill" /></div>
      <ol className="ix-jlist">
        {items.map((it, i) => {
          const state = i < nowIdx ? 'is-done' : i === nowIdx ? 'is-now' : 'is-next';
          return (
            <li key={it.k} className={`ix-jitem ${state}`} style={{ '--i': i } as React.CSSProperties} aria-current={state === 'is-now' ? 'step' : undefined}>
              <span className="ix-dot" aria-hidden="true">{state === 'is-now' && <span className="ix-ping" />}</span>
              <div className="ix-jcard">
                <p className="ix-jk">{it.k}</p>
                <p className="ix-jt">{it.t}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
