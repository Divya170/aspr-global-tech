'use client';

// Company "Process" page: animated hero, a sticky step map with scroll progress, and the seven
// steps laid along a timeline grouped by stage. The step in the middle of the screen is active.
// Step ids (#step-01…) and the step chips' handlers come from CompanyLogic, so deep links keep working.

import { useEffect, useRef, useState } from 'react';
import AskAiButton from './AskAiButton';

const STEP_ICON = { Discover: 'travel_explore', Define: 'edit_document', Design: 'draw', Develop: 'code', Test: 'bug_report', Deploy: 'rocket_launch', Support: 'support_agent' };
const STAGE_ICON = ['lightbulb', 'construction', 'trending_up'];

export default function ProcessJourney({ stepIndex = [], groups = [] }) {
  const steps = groups.flatMap((g) => g.steps || []);
  const [active, setActive] = useState(steps[0]?.id || '');
  const [progress, setProgress] = useState(0);
  const [shown, setShown] = useState({});
  const [heroIn, setHeroIn] = useState(false);
  const wrap = useRef(null);

  useEffect(() => { const t = setTimeout(() => setHeroIn(true), 60); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setShown(Object.fromEntries(steps.map((s) => [s.id, true]))); return; }
    const spy = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
    const reveal = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { setShown((m) => ({ ...m, [e.target.id]: true })); reveal.unobserve(e.target); }
    }), { threshold: 0.15 });
    steps.forEach((s) => { const el = document.getElementById(s.id); if (el) { spy.observe(el); reveal.observe(el); } });
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.5;
      setProgress(Math.max(0, Math.min(1, (window.innerHeight * 0.5 - r.top) / total)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { spy.disconnect(); reveal.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeIdx = Math.max(0, steps.findIndex((s) => s.id === active));
  const activeStage = groups.findIndex((g) => (g.steps || []).some((s) => s.id === active));

  return (
    <>
      <section data-screen-label="Process — Hero" className={`pj-hero${heroIn ? ' is-in' : ''}`}>
        <svg aria-hidden="true" viewBox="0 0 700 360" className="pj-arc"><path d="M 20 330 Q 330 -60 690 110" /></svg>
        <div className="pj-wrap pj-hero-in">
          <p className="pj-eyebrow">PROCESS</p>
          <h1 className="pj-h1">
            <span style={{ '--d': 0 }}>Think it.</span> <span className="is-blue" style={{ '--d': 1 }}>Build it.</span> <span style={{ '--d': 2 }}>Scale it.</span>
          </h1>
          <p className="pj-lead">Seven clear steps, from first call to long after launch. Each one produces something you can see, check and keep.</p>
          <div className="pj-stats">
            <div><strong>7</strong><span>steps</span></div>
            <div><strong>3</strong><span>stages</span></div>
            <div><strong>1</strong><span>point of contact</span></div>
            <div><strong>Week 1</strong><span>staging link</span></div>
          </div>
          <div className="pj-chips">
            {stepIndex.map((sx, i) => (
              <a key={sx.n} href={sx.href} onClick={sx.go} style={{ '--i': i }}>
                <b aria-hidden="true">{STEP_ICON[sx.t] || 'radio_button_checked'}</b><span>{sx.n}</span>{sx.t}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section data-screen-label="Process — Steps" className="pj-body">
        <div className="pj-wrap pj-layout" ref={wrap}>
          <aside className="pj-map" aria-label="Process steps">
            <p className="pj-map-h">YOUR PROJECT JOURNEY</p>
            <div className="pj-map-bar"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <p className="pj-map-pct">{Math.round(progress * 100)}% through · {groups[activeStage]?.verb || ''}</p>
            <ol>
              {steps.map((s, i) => (
                <li key={s.id} className={i === activeIdx ? 'is-on' : i < activeIdx ? 'is-done' : ''}>
                  <a href={stepIndex[i]?.href} onClick={stepIndex[i]?.go}>
                    <span className="pj-map-dot" aria-hidden="true">{i < activeIdx ? '✓' : s.n}</span>{s.t}
                  </a>
                </li>
              ))}
            </ol>
            <div className="pj-map-cta">
              <p><b>It all starts with a free Discover call.</b> Tell us your goal — we reply within one working day.</p>
              <a href="/#start">Start with Discover →</a>
            </div>
          </aside>

          <div className="pj-flow">
            {groups.map((g, gi) => (
              <div key={g.verb} className="pj-stage">
                <div className={`pj-stage-head is-s${gi}`}>
                  <span className="pj-stage-icon" aria-hidden="true">{STAGE_ICON[gi] || 'flag'}</span>
                  <div>
                    <p className="pj-stage-label">{g.stage}</p>
                    <h2>{g.verb}</h2>
                    <p className="pj-stage-sum">{g.sum}</p>
                  </div>
                </div>
                <div className="pj-steps">
                  {(g.steps || []).map((s) => (
                    <article key={s.id} id={s.id} className={`pj-step${active === s.id ? ' is-on' : ''}${shown[s.id] ? ' is-shown' : ''}`}>
                      <span className="pj-node" aria-hidden="true" />
                      <div className="pj-card">
                        <div className="pj-card-head">
                          <span className="pj-icon" aria-hidden="true">{STEP_ICON[s.t] || 'radio_button_checked'}</span>
                          <div style={{ minWidth: 0 }}>
                            <p className="pj-num">STEP {s.n}</p>
                            <h3>{s.t}</h3>
                          </div>
                          <span className="pj-big" aria-hidden="true">{s.n}</span>
                        </div>
                        <p className="pj-desc">{s.d}</p>
                        <p className="pj-get">YOU GET</p>
                        <ul>
                          {(s.out || []).map((o, oi) => <li key={o} style={{ '--i': oi }}><b aria-hidden="true">check</b>{o}</li>)}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}

            <div className="pj-end">
              <span className="pj-end-icon" aria-hidden="true">flag</span>
              <div>
                <h2>Ready for step one?</h2>
                <p>Book a short Discover call. You&apos;ll get scope, price and timeline in writing — before any build starts.</p>
              </div>
              <div className="pj-end-ctas">
                <a href="/#start" className="sv-btn sv-btn-white">Start a project →</a>
                <AskAiButton className="sv-btn sv-btn-line" question="How does your project process work, step by step?"><b aria-hidden="true">smart_toy</b>Ask AI</AskAiButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
