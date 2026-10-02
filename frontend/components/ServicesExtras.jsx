'use client';

// /services: "Included with every service", an interactive 7-step stepper, and the
// popular service combinations — all revealed on scroll.

import { useEffect, useRef, useState } from 'react';

function useSeen(threshold = 0.2) {
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

const ALWAYS = [
  ['description', 'Written scope, price and timeline', 'Signed off before any build starts — no surprise bills.'],
  ['visibility', 'A staging link you can check any day', 'Watch your project grow instead of waiting for a big reveal.'],
  ['key', 'Code, designs and accounts in your name', 'From day one. No lock-in, no hidden licence fees.'],
  ['support_agent', 'One point of contact, and support after launch', 'A real person who knows your project — before and after go-live.'],
];

const STEP_ICON = { Discover: 'travel_explore', Define: 'edit_document', Design: 'draw', Develop: 'code', Test: 'bug_report', Deploy: 'rocket_launch', Support: 'support_agent' };
const PACK_ICON = { Launch: 'rocket_launch', Replace: 'sync_alt', 'Be found': 'travel_explore', 'Ship the app': 'smartphone' };
const NEED_ICON = { Website: 'language', App: 'smartphone', Game: 'sports_esports', Logo: 'draw', Graphics: 'palette', Video: 'movie', 'Business Systems': 'account_tree', SEO: 'travel_explore', 'SaaS / Software': 'cloud', 'AI / Chatbot': 'smart_toy' };

export function AlwaysIncluded() {
  const [ref, seen] = useSeen();
  return (
    <section ref={ref} className={`sx-always${seen ? ' is-seen' : ''}`}>
      <div className="sv-wrap">
        <div className="sv-row-head">
          <h2 className="sv-h2">Included with <span>every</span> service</h2>
          <span className="sv-muted">Whatever you hire us for, these come standard</span>
        </div>
        <div className="sx-always-grid">
          {ALWAYS.map(([icon, title, sub], i) => (
            <div key={title} className="sx-al" style={{ '--i': i }}>
              <span className="sx-al-shine" aria-hidden="true" />
              <b aria-hidden="true">{icon}</b>
              <p className="sx-al-t">{title}</p>
              <p className="sx-al-s">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StepsStepper({ steps = [] }) {
  const [ref, seen] = useSeen(0.3);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!seen || !auto || steps.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % steps.length), 3000);
    return () => clearInterval(id);
  }, [seen, auto, steps.length]);

  if (!steps.length) return null;
  const cur = steps[active];
  const pct = steps.length > 1 ? (active / (steps.length - 1)) * 100 : 100;
  const pick = (i) => { setActive(i); setAuto(false); };

  return (
    <section ref={ref} className={`sx-steps${seen ? ' is-seen' : ''}`}>
      <div className="sv-wrap">
        <div className="sv-row-head">
          <h2 className="sv-h2">How every project runs</h2>
          <a href="/company#process" className="sv-link">See the full process →</a>
        </div>
        <div className="sx-stepper" style={{ '--n': steps.length }}>
          <div className="sx-line" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          <ol className="sx-nodes" role="tablist" aria-label="Project steps">
            {steps.map((s, i) => (
              <li key={s.num} style={{ '--i': i }}>
                <button type="button" role="tab" aria-selected={i === active} onClick={() => pick(i)}
                  className={`sx-node${i === active ? ' is-on' : ''}${i < active ? ' is-done' : ''}`}>
                  <span className="sx-node-icon" aria-hidden="true">{STEP_ICON[s.title] || 'radio_button_checked'}</span>
                  <span className="sx-node-n">{s.num}</span>
                  <span className="sx-node-t">{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="sx-detail" role="tabpanel" key={cur.num}>
            <span className="sx-detail-icon" aria-hidden="true">{STEP_ICON[cur.title] || 'radio_button_checked'}</span>
            <div className="sx-detail-main">
              <p className="sx-detail-n">STEP {cur.num} OF {String(steps.length).padStart(2, '0')}</p>
              <h3>{cur.title}</h3>
              <p className="sx-detail-d">{cur.description}</p>
            </div>
            {(cur.outputs || []).length ? (
              <ul className="sx-detail-out">
                <li className="sx-detail-out-h">YOU GET</li>
                {cur.outputs.map((o, i) => <li key={o} style={{ '--i': i }}><b aria-hidden="true">check</b>{o}</li>)}
              </ul>
            ) : null}
            {auto ? <span className="sx-detail-timer" aria-hidden="true" /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PackCards({ packages = [] }) {
  const [ref, seen] = useSeen();
  if (!packages.length) return null;
  return (
    <section ref={ref} className={`sx-packs${seen ? ' is-seen' : ''}`}>
      <div className="sv-wrap">
        <div className="sv-row-head">
          <h2 className="sv-h2">Popular <span>combinations</span></h2>
          <span className="sv-muted">Services that work better together — one team, one timeline</span>
        </div>
        <div className="sx-packs-grid">
          {packages.map((p, i) => (
            <div key={p.name} className={`sx-pack is-c${i % 4}`} style={{ '--i': i }}>
              <div className="sx-pack-top">
                <span className="sx-pack-icon" aria-hidden="true">{PACK_ICON[p.name] || 'layers'}</span>
                <span className="sx-pack-count">1 team · {p.services.length} services</span>
              </div>
              <p className="sx-pack-name">{p.name}</p>
              <p className="sx-pack-out">{p.outcome}</p>
              <div className="sx-pack-svcs">
                {p.services.map((x) => <span key={x}><b aria-hidden="true">{NEED_ICON[x] || 'add'}</b>{x}</span>)}
              </div>
              <div className="sx-pack-foot">
                <span><b aria-hidden="true">sell</b>{p.price}</span>
                <a href="/#start">Plan this combo →</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
