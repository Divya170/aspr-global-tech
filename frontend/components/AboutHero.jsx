'use client';

// About page: modern hero (headline + story told as animated chapters) and the
// Mission & Vision band as glass cards.

import { useEffect, useRef, useState } from 'react';
import AskAiButton from './AskAiButton';

const CHAPTERS = [
  { icon: 'emoji_objects', tag: 'The spark', text: "A father noticed his son didn't learn from books — he learned by making things." },
  { icon: 'construction', tag: 'Learning by building', text: 'So he let him build. Websites first, then apps, then whatever friends and local shops needed.' },
  { icon: 'diversity_3', tag: '2026 · The team', text: 'Along the way he met other makers just like him. In 2026 they came together as ASPR Global Tech.' },
];

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

export function AboutHero() {
  const [ref, seen] = useSeen(0.1);
  return (
    <section data-screen-label="About — Story" ref={ref} className={`ah${seen ? ' is-in' : ''}`}>
      <div aria-hidden="true" className="ah-blob ah-blob-1" />
      <div aria-hidden="true" className="ah-blob ah-blob-2" />
      <div className="ah-in">
        <div className="ah-left">
          <span className="ah-badge"><b aria-hidden="true">auto_awesome</b>ABOUT ASPR GLOBAL TECH</span>
          <h1 className="ah-h1">
            <span style={{ '--d': 0 }}>We learn by</span>{' '}
            <span className="ah-grad" style={{ '--d': 1 }}>building.</span>{' '}
            <span style={{ '--d': 2 }}>Now we build</span>{' '}
            <span style={{ '--d': 3 }}>for you.</span>
          </h1>
          <p className="ah-lead">A team of makers who learned by doing — now building websites, apps, AI and brands for businesses in the US and around the world.</p>
          <div className="ah-chips">
            <span><b aria-hidden="true">construction</b>Build</span>
            <span><b aria-hidden="true">palette</b>Brand</span>
            <span><b aria-hidden="true">trending_up</b>Grow</span>
          </div>
          <div className="ah-ctas">
            <a href="/#start" className="sv-btn sv-btn-main">Start a project →</a>
            <AskAiButton className="sv-btn sv-btn-ghost" question="Tell me about ASPR Global Tech — who you are and how you work."><b aria-hidden="true">smart_toy</b>Ask about us</AskAiButton>
          </div>
        </div>

        <ol className="ah-story" aria-label="Our story">
          {CHAPTERS.map((c, i) => (
            <li key={c.tag} className="ah-ch" style={{ '--i': i }}>
              <span className="ah-ch-icon" aria-hidden="true">{c.icon}</span>
              <div>
                <p className="ah-ch-tag">{c.tag}</p>
                <p className="ah-ch-text">{c.text}</p>
              </div>
            </li>
          ))}
          <li className="ah-ch ah-today" style={{ '--i': CHAPTERS.length }}>
            <span className="ah-ch-icon" aria-hidden="true">public</span>
            <div>
              <p className="ah-ch-tag">Today</p>
              <p className="ah-ch-text">One team builds websites, apps, games and brands for businesses in the US and around the world.</p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

const MV = [
  { k: 'MISSION', icon: 'flag', text: 'To give growing businesses the kind of digital execution that used to be reserved for companies with in-house teams and enterprise budgets.' },
  { k: 'VISION', icon: 'visibility', text: 'To become the studio that businesses around the world call first — and the place where self-taught, unconventional talent gets a real career.' },
];

export function MissionVision() {
  const [ref, seen] = useSeen(0.25);
  return (
    <section data-screen-label="About — Mission" ref={ref} className={`mv${seen ? ' is-in' : ''}`}>
      <div aria-hidden="true" className="ab-facts-orb ab-facts-orb-1" />
      <div aria-hidden="true" className="ab-facts-orb ab-facts-orb-2" />
      <div className="mv-in">
        <div className="mv-head">
          <p className="mv-eyebrow">WHY WE EXIST</p>
          <h2>Big-company quality. <span>Small-team care.</span></h2>
        </div>
        <div className="mv-grid">
          {MV.map((m, i) => (
            <article key={m.k} className="mv-card" style={{ '--i': i }}>
              <span className="mv-quote" aria-hidden="true">&ldquo;</span>
              <div className="mv-top"><span className="mv-icon" aria-hidden="true">{m.icon}</span><p className="mv-k">{m.k}</p></div>
              <p className="mv-text">{m.text}</p>
            </article>
          ))}
        </div>
        <div className="mv-pillars">
          {[['construction', 'Build', 'Websites, apps, SaaS, AI and games'], ['palette', 'Brand', 'Logos, graphics and video'], ['trending_up', 'Grow', 'SEO and business systems']].map(([ic, t, d], i) => (
            <div key={t} style={{ '--i': i }}><b aria-hidden="true">{ic}</b><span><strong>{t}</strong>{d}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}
