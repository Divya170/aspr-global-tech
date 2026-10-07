'use client';

import { useEffect, useRef, useState } from 'react';
import type { Step } from '@/lib/types';

/**
 * The development process as a vertical timeline. A progress line fills as you scroll and
 * each step lights up when it reaches the middle of the screen.
 */
export function ProcessTimeline({ steps, detailed = false }: { steps: Step[]; detailed?: boolean }) {
  const ref = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const mid = window.innerHeight * 0.55;
      setProgress(Math.min(Math.max((mid - r.top) / r.height, 0), 1));
      const items = [...el.querySelectorAll<HTMLElement>('[data-step]')];
      let idx = -1;
      items.forEach((it, i) => { if (it.getBoundingClientRect().top < mid) idx = i; });
      setActiveIdx(idx);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  return (
    <ol ref={ref} className="relative mx-auto max-w-4xl">
      <div aria-hidden="true" className="absolute bottom-6 left-[1.4rem] top-6 w-px bg-line-strong sm:left-1/2">
        <div className="w-full origin-top bg-gradient-to-b from-brand via-accent to-signal" style={{ height: `${progress * 100}%` }} />
      </div>
      {steps.map((s, i) => {
        const on = i <= activeIdx;
        const right = i % 2 === 1;
        return (
          <li key={s.id} data-step className="relative grid grid-cols-[2.8rem_1fr] gap-5 pb-12 last:pb-0 sm:grid-cols-[1fr_3.5rem_1fr] sm:gap-8">
            <div className={`hidden sm:block ${right ? '' : 'sm:order-none'}`}>
              {!right && <StepBody s={s} on={on} detailed={detailed} align="right" />}
            </div>
            <div className="relative flex justify-center">
              <span className={`relative z-10 grid size-11 place-items-center rounded-full border font-mono text-sm transition-all duration-700 ${on ? 'border-brand bg-brand-strong text-white shadow-[0_0_30px_rgb(65_112_255/0.6)]' : 'border-line-strong bg-bg text-subtle'}`}>
                {s.num}
              </span>
            </div>
            <div className="sm:hidden"><StepBody s={s} on={on} detailed={detailed} align="left" /></div>
            <div className="hidden sm:block">{right && <StepBody s={s} on={on} detailed={detailed} align="left" />}</div>
          </li>
        );
      })}
    </ol>
  );
}

function StepBody({ s, on, detailed, align }: { s: Step; on: boolean; detailed: boolean; align: 'left' | 'right' }) {
  return (
    <div className={`pt-1.5 transition-opacity duration-700 ${on ? 'opacity-100' : 'opacity-80'} ${align === 'right' ? 'sm:text-right' : ''}`}>
      <h3 className="text-xl font-semibold uppercase tracking-wide text-text sm:text-2xl">{s.title}</h3>
      <p className="mt-2 leading-relaxed text-muted">{s.description}</p>
      {detailed && s.outputs && s.outputs.length > 0 && (
        <ul className={`mt-4 flex flex-wrap gap-2 ${align === 'right' ? 'sm:justify-end' : ''}`}>
          {s.outputs.map((o) => <li key={o} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{o}</li>)}
        </ul>
      )}
    </div>
  );
}
