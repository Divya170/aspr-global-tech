'use client';

// Service page FAQs: animated question cards (same style as the home FAQ) with an
// "Ask our AI" card on the left whose quick questions are about this service.

import { useEffect, useRef, useState } from 'react';
import { AskAiCard } from './HomeFaq';

const ICONS = ['help', 'lightbulb', 'verified', 'forum', 'schedule'];

export default function ServiceFaq({ faqs = [], serviceName = '', timeline = '', budget = '' }) {
  const [open, setOpen] = useState(0);
  const [seen, setSeen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!faqs.length) return null;
  const name = /^[A-Z]{2,}$/.test(serviceName) ? serviceName : serviceName.toLowerCase(); // keep "SEO" as is
  const chips = [`How much does ${name} cost?`, `How long does ${name} take?`, `What do I need to get started?`];

  return (
    <section ref={ref} className={`hf sfq${seen ? ' is-seen' : ''}`}>
      <div className="hf-inner">
        <div className="hf-side">
          <p className="hf-eyebrow">QUESTIONS</p>
          <h2 className="hf-title">About <span>{name}.</span></h2>
          <p className="hf-sub">Straight answers to what clients ask us most. Need something specific? Ask the assistant — it knows this service inside out.</p>
          <AskAiCard chips={chips} status={`Online · knows our ${name} service`} />
          <div className="hf-links">
            <a href="https://wa.me/917539907704" target="_blank" rel="noopener noreferrer" className="hf-wa"><span className="hf-dot" />WhatsApp us</a>
            <a href="/company#faq" className="hf-all">Read all FAQs →</a>
          </div>
        </div>

        <div className="sfq-right">
          {(timeline || budget) ? (
            <div className="sfq-quick">
              {timeline ? <div><b aria-hidden="true">schedule</b><span>Typical timeline</span><strong>{timeline}</strong></div> : null}
              {budget ? <div><b aria-hidden="true">payments</b><span>Typical budget</span><strong>{budget}</strong></div> : null}
            </div>
          ) : null}
          <ol className="hf-list">
            {faqs.map(([q, a], i) => {
              const on = open === i;
              return (
                <li key={q} className={`hf-card${on ? ' is-open' : ''}`} style={{ '--i': i }}>
                  <button type="button" className="hf-q" aria-expanded={on} onClick={() => setOpen(on ? -1 : i)}>
                    <span aria-hidden="true" className="hf-icon">{ICONS[i % ICONS.length]}</span>
                    <span className="hf-q-text">{q}</span>
                    <span aria-hidden="true" className="hf-toggle">+</span>
                  </button>
                  <div className="hf-a" role="region" aria-hidden={!on}><div><p>{a}</p></div></div>
                </li>
              );
            })}
            <li className="hf-card sfq-more" style={{ '--i': faqs.length }}>
              <span aria-hidden="true" className="hf-icon">mark_chat_unread</span>
              <div>
                <p className="sfq-more-t">Still have a question?</p>
                <p className="sfq-more-d">We reply within one working day — or get an instant answer from the assistant.</p>
              </div>
              <a href="/company#contact" className="sfq-more-go">Contact us →</a>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
