'use client';

// Home "What we build": filterable bento grid. Cards are full-bleed images; hovering (or
// focusing) a card reveals what's included and the typical timeline, and every card opens
// its own service page.

import { useEffect, useRef, useState } from 'react';
import { serviceSlug } from '@/lib/services';

const PILLARS = ['All', 'Build', 'Brand', 'Grow'];
const ask = (question) => window.dispatchEvent(new CustomEvent('aspr:chat', { detail: { question } }));

export default function ServicesBento({ services = [], details = {} }) {
  const [filter, setFilter] = useState('All');
  const [all, setAll] = useState(false);
  const [seen, setSeen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const matching = services.filter((s) => filter === 'All' || s.pillar === filter);
  const LIMIT = 6;
  const list = all ? matching : matching.slice(0, LIMIT);

  return (
    <section id="services" data-screen-label="What We Build" ref={ref} className={`sb${seen ? ' is-seen' : ''}`}>
      <div className="sb-inner">
        <div className="sb-head">
          <div>
            <p className="sb-eyebrow">WHAT WE BUILD</p>
            <h2 className="sb-title">Everything you need to <span>launch, look great and grow.</span></h2>
          </div>
          <a href="/services" className="sb-all">Explore all services <span aria-hidden="true">→</span></a>
        </div>

        <div role="tablist" aria-label="Filter services by pillar" className="sb-filters">
          {PILLARS.map((p) => {
            const count = p === 'All' ? services.length : services.filter((s) => s.pillar === p).length;
            return (
              <button key={p} type="button" role="tab" aria-selected={filter === p} className={`sb-filter${filter === p ? ' is-on' : ''}`} onClick={() => { setFilter(p); setAll(false); }}>
                {p}<span>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="sb-grid" key={filter}>
          {list.map((s, i) => {
            const slug = serviceSlug(s.name);
            const d = details[slug] || {};
            return (
              <a key={s.name} href={`/services/${slug}`} className="sb-card" style={{ '--i': i }}>
                <div className="sb-img">
                  <img src={s.img} alt={s.alt} loading="lazy" style={{ objectPosition: s.pos }} />
                  <span className="sb-pillar">{String(s.pillar).toUpperCase()}</span>
                </div>
                <div className="sb-body">
                  <div className="sb-titlerow">
                    <span className="sb-icon" aria-hidden="true">{s.icon}</span>
                    <h3 className="sb-name">{s.name}</h3>
                  </div>
                  <p className="sb-line">{d.tagline || s.line}</p>
                  {(d.deliverables || []).length ? (
                    <ul className="sb-list">
                      {d.deliverables.slice(0, 3).map((x) => <li key={x}><b aria-hidden="true">check</b>{x}</li>)}
                    </ul>
                  ) : null}
                  <div className="sb-foot">
                    {d.timeline ? <span className="sb-time"><b aria-hidden="true">schedule</b>{d.timeline}</span> : <span />}
                    <span className="sb-go">Explore <i aria-hidden="true">→</i></span>
                  </div>
                </div>
              </a>
            );
          })}
          <div className="sb-help">
            <span className="sb-help-icon" aria-hidden="true">tips_and_updates</span>
            <p><b>Not sure which service you need?</b> Tell our AI assistant what you want to achieve — it will point you to the right one.</p>
            <button type="button" onClick={() => ask('I am not sure which service I need. Can you help me choose?')}>Help me choose →</button>
          </div>
        </div>

        {matching.length > LIMIT ? (
          <div className="sb-moreRow">
            <button type="button" className="sb-moreBtn" onClick={() => setAll((x) => !x)} aria-expanded={all}>
              {all ? 'Show fewer' : `Show all ${matching.length} services`}<b aria-hidden="true">{all ? 'expand_less' : 'expand_more'}</b>
            </button>
          </div>
        ) : null}

      </div>
    </section>
  );
}
