'use client';

// "How hiring works" as interactive cards: the steps light up in turn with a progress line,
// cards tilt toward the cursor with a following spotlight, and they slide in on first view.
// Hovering or focusing a card takes over from the auto-play; motion is off for reduced-motion users.

import { useEffect, useRef, useState } from 'react';

const CYCLE_MS = 2600;

export default function HiringSteps({ steps = [] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState(false);
  const root = useRef(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || paused || reduced.current || steps.length < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % steps.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [seen, paused, steps.length]);

  const tilt = (e) => {
    if (reduced.current) return;
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
    card.style.setProperty('--ry', `${(x - 0.5) * 12}deg`);
    card.style.setProperty('--mx', `${x * 100}%`);
    card.style.setProperty('--my', `${y * 100}%`);
  };
  const untilt = (e) => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); };

  const progress = steps.length > 1 ? (active / (steps.length - 1)) * 100 : 100;

  return (
    <div ref={root} className={`hs-root${seen ? ' hs-seen' : ''}`} onMouseLeave={() => setPaused(false)}>
      <div className="hs-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <ol className="hs-grid">
        {steps.map((s, i) => (
          <li key={s.n || i} className={`hs-card${i === active ? ' is-active' : ''}${i < active ? ' is-done' : ''}`}
            style={{ '--i': i }} tabIndex={0}
            onMouseEnter={() => { setPaused(true); setActive(i); }}
            onFocus={() => { setPaused(true); setActive(i); }} onBlur={() => setPaused(false)}
            onMouseMove={tilt} onMouseLeave={untilt}
            aria-current={i === active ? 'step' : undefined}>
            <span className="hs-glow" aria-hidden="true" />
            <div className="hs-top">
              <span className="hs-num">{s.n}</span>
              {s.icon ? <span className="hs-icon" aria-hidden="true">{s.icon}</span> : null}
            </div>
            <p className="hs-title">{s.t}</p>
            {s.d ? <p className="hs-desc">{s.d}</p> : null}
            <span className="hs-bar" aria-hidden="true"><span /></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
