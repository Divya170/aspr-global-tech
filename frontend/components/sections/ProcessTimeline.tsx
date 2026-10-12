'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import type { Step } from '@/lib/types';
import '@/components/pages/services/services.css';

/**
 * The development process as a vertical timeline. The rail fills as you scroll (with a glowing
 * head), steps slide in from their side, and the step at the middle of the screen is highlighted
 * while its giant outlined number fills on the other side of the rail.
 */
export function ProcessTimeline({ steps, detailed = false }: { steps: Step[]; detailed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [seenIdx, setSeenIdx] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setArmed(true);
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const mid = vh * 0.55;
      el.style.setProperty('--p', String(Math.min(Math.max((mid - r.top) / r.height, 0), 1)));
      let idx = -1, seen = -1;
      el.querySelectorAll<HTMLElement>('[data-step]').forEach((it, i) => {
        const top = it.getBoundingClientRect().top;
        if (top < mid) idx = i;
        if (top < vh * 0.9) seen = i;
      });
      setActiveIdx(idx);
      setSeenIdx((s) => Math.max(s, seen));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  return (
    <div ref={ref} className={`svx-tl ${armed ? 'is-armed' : ''}`}>
      <div aria-hidden="true" className="svx-tl-rail"><span className="svx-tl-fill" /><span className="svx-tl-head" /></div>
      <ol>
        {steps.map((s, i) => (
          <li
            key={s.id} data-step style={{ '--i': i } as CSSProperties}
            className={`svx-tl-item ${i % 2 ? 'is-right' : 'is-left'} ${i <= activeIdx ? 'is-on' : ''} ${i === activeIdx ? 'is-current' : ''} ${i <= seenIdx ? 'is-in' : ''}`}
          >
            <div className="svx-tl-nodecol"><span className="svx-tl-node">{s.num}</span></div>
            <div className="svx-tl-card">
              <h3 className="svx-tl-title">{s.title}</h3>
              <p className="svx-tl-desc">{s.description}</p>
              {detailed && s.outputs && s.outputs.length > 0 && (
                <ul className="svx-tl-outs">
                  {s.outputs.map((o) => <li key={o} className="svx-tl-out"><Check aria-hidden="true" size={13} strokeWidth={2.4} />{o}</li>)}
                </ul>
              )}
            </div>
            <span className="svx-tl-num" aria-hidden="true">{s.num}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
