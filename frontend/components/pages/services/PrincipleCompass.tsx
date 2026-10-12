'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Compass } from 'lucide-react';
import { useAutoCycle, useInView } from '@/components/interactive/hooks';
import './services.css';

const CYCLE = 3200;
/** Visit the 2×2 cards clockwise (TL, TR, BR, BL) so the needle always turns the same way. */
const ORDER = [0, 1, 3, 2];

/**
 * Four principles around a compass hub: the cards wrap around the hub, the active card lights up
 * with a timer bar and the needle swings to point at it. Hover or focus picks a card.
 */
export function PrincipleCompass({ items }: { items: { icon: ReactNode; t: string; d: string }[] }) {
  const quad = items.length === 4;
  const [ref, seen, armed] = useInView<HTMLDivElement>(0.3);
  const { active: step, paused, pick, resume } = useAutoCycle(items.length, seen, CYCLE);
  const active = quad ? ORDER[step] : step;
  // Turn the needle by the shortest way to the next card, so the auto-play always moves forward.
  const [deg, setDeg] = useState(-45);
  const prev = useRef(step);
  useEffect(() => {
    const n = items.length;
    let d = (step - prev.current + n) % n;
    if (d > n / 2) d -= n;
    prev.current = step;
    if (d) setDeg((a) => a + d * 90);
  }, [step, items.length]);

  return (
    <div
      ref={ref} onMouseLeave={resume}
      className={`svx-compass ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''} ${paused ? 'is-paused' : ''}`}
      style={{ '--cycle': `${CYCLE}ms` } as CSSProperties}
    >
      <ul className="svx-pr-grid">
        {items.map((it, i) => {
          const at = quad ? ORDER.indexOf(i) : i;
          return (
            <li
              key={it.t} tabIndex={0} style={{ '--i': i } as CSSProperties}
              className={`svx-pr ${seen && i === active ? 'is-on' : ''}`}
              onMouseEnter={() => pick(at)} onFocus={() => pick(at)} onBlur={resume}
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
              }}
            >
              <span className="svx-pr-icon" aria-hidden="true">{it.icon}</span>
              <div>
                <h3 className="text-lg font-semibold text-text">{it.t}</h3>
                <p className="svx-pr-d">{it.d}</p>
              </div>
              <span className="svx-pr-bar" aria-hidden="true"><span /></span>
            </li>
          );
        })}
      </ul>
      {quad && (
        <div className="svx-hub" aria-hidden="true">
          <span className="svx-hub-needle" style={{ '--deg': `${deg}deg` } as CSSProperties} />
          <span className="svx-hub-core"><Compass size={26} strokeWidth={1.6} /></span>
        </div>
      )}
    </div>
  );
}
