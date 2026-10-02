'use client';

// About page: an animated "How we got here" timeline and an interactive "What we hold to"
// values list. The timeline line draws itself on first view; the values list tracks the row
// in the middle of the screen (or under the cursor) and mirrors it on a sticky photo card.

import { useEffect, useRef, useState } from 'react';

function useSeen(threshold = 0.3) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
}

// ─────────── Timeline ───────────

const MILESTONE_ICON = { Before: 'history', Now: 'rocket_launch', Next: 'flag' };

export function JourneyTimeline({ items = [] }) {
  const [ref, seen] = useSeen(0.35);
  const nowIdx = Math.max(0, items.findIndex((x) => x.k === 'Now'));
  return (
    <section data-screen-label="About — Timeline" ref={ref} className={`jt${seen ? ' is-seen' : ''}`} style={{ '--n': items.length, '--now': nowIdx }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: 'clamp(46px,5.58vw,72px) clamp(20px,4vw,48px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px 24px', marginBottom: '48px' }}>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(14px,1.4vw,18px)', letterSpacing: '0.16em' }}>HOW WE GOT HERE</h2>
          <span style={{ color: '#5A6380', fontSize: '16px' }}>From separate freelancers to one studio</span>
        </div>
        <div className="jt-wrap">
        <span className="jt-rail" aria-hidden="true"><span className="jt-fill" /></span>
        <ol className="jt-list">
          {items.map((m, i) => {
            const state = i < nowIdx ? 'done' : i === nowIdx ? 'now' : 'next';
            return (
              <li key={m.k} className={`jt-item is-${state}`} style={{ '--i': i }}>
                <span className="jt-dot" aria-hidden="true">{state === 'now' ? <span className="jt-ping" /> : null}</span>
                <div className="jt-card">
                  <span className="jt-icon" aria-hidden="true">{MILESTONE_ICON[m.k] || 'verified'}</span>
                  <p className="jt-k">{m.k}{state === 'now' ? <span className="jt-live">LIVE</span> : null}</p>
                  <p className="jt-t">{m.t}</p>
                </div>
              </li>
            );
          })}
        </ol>
        </div>
      </div>
    </section>
  );
}

// ─────────── Values ───────────

const VALUE_ICON = {
  'Skill over syllabus': 'construction',
  'Say the hard thing early': 'campaign',
  'Ship it properly': 'rocket_launch',
  'Keep it explainable': 'lightbulb',
  'Stay curious': 'explore',
};

/**
 * Reused for "What we hold to" (About) and "Why ASPR" (Home). `children` render under the photo.
 */
export function ValuesList({ values = [], title = 'WHAT WE HOLD TO', label = 'VALUE', screenLabel = 'About — Values', icons = VALUE_ICON,
  img = '/assets/coding.png', imgAlt = 'Developer typing code on a laptop at a desk', className = '', children }) {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [ref, seen] = useSeen(0.15);
  const rows = useRef([]);

  // Scroll-spy: the row crossing the middle band of the viewport becomes active.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      if (hovering) return;
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(Number(hit.target.dataset.i));
    }, { rootMargin: '-45% 0px -45% 0px' });
    rows.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, [values.length, hovering]);

  const cur = values[active] || {};
  return (
    <section data-screen-label={screenLabel} ref={ref} className={`vl ${className}${seen ? ' is-seen' : ''}`}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: 'clamp(46px,5.58vw,72px) clamp(20px,4vw,48px)', display: 'flex', flexWrap: 'wrap', gap: '32px clamp(32px,6vw,96px)', alignItems: 'flex-start' }}>
        <div className="vl-side">
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(14px,1.4vw,18px)', letterSpacing: '0.16em' }}>{title}</h2>
          <div className="vl-photo">
            <img src={img} alt={imgAlt} loading="lazy" />
            <div className="vl-glass" key={active}>
              <span className="vl-glass-icon" aria-hidden="true">{icons[cur.t] || 'star'}</span>
              <div style={{ minWidth: 0 }}>
                <p className="vl-glass-n">{label} {cur.n} / {String(values.length).padStart(2, '0')}</p>
                <p className="vl-glass-t">{cur.t}</p>
              </div>
            </div>
            <div className="vl-dots" aria-hidden="true">
              {values.map((_, i) => <span key={i} className={i === active ? 'is-on' : ''} />)}
            </div>
          </div>
          {children}
        </div>
        <ol className="vl-list" onMouseLeave={() => setHovering(false)}>
          {values.map((x, i) => (
            <li key={x.t} ref={(el) => { rows.current[i] = el; }} data-i={i} style={{ '--i': i }}
              className={`vl-row${i === active ? ' is-on' : ''}`}
              onMouseEnter={() => { setHovering(true); setActive(i); }}>
              <span className="vl-n">{x.n}</span>
              <div style={{ minWidth: 0 }}>
                <h3 className="vl-t">{x.t}<span className="vl-arrow" aria-hidden="true">{icons[x.t] || 'arrow_forward'}</span></h3>
                <p className="vl-d">{x.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
