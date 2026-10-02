'use client';

// Home page FAQ: an "Ask our AI" card on the left (opens the site assistant, optionally with a
// question already asked) and animated question cards on the right.

import { useEffect, useRef, useState } from 'react';

const ICONS = [
  [/start a project/i, 'rocket_launch'], [/talking to/i, 'forum'], [/outside|US and other|countries/i, 'public'],
  [/alongside|existing team/i, 'group_add'], [/price a project/i, 'request_quote'], [/cost/i, 'payments'],
  [/how long/i, 'schedule'], [/phases/i, 'stacks'], [/handover/i, 'inventory_2'], [/own the code/i, 'key'],
  [/breaks/i, 'build'], [/support/i, 'support_agent'], [/app and web/i, 'devices'], [/technolog/i, 'code'],
  [/brand work/i, 'palette'], [/someone else/i, 'healing'],
];
const iconFor = (q) => (ICONS.find(([re]) => re.test(q)) || [null, 'help'])[1];

const ASK = ['Do you work with US clients?', 'How much does an app cost?', 'What tech do you use?'];

const ask = (question) => window.dispatchEvent(new CustomEvent('aspr:chat', { detail: { question } }));

export default function HomeFaq({ faqs = [], total = 0 }) {
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

  return (
    <section data-screen-label="FAQ" ref={ref} className={`hf${seen ? ' is-seen' : ''}`}>
      <div className="hf-inner">
        <div className="hf-side">
          <p className="hf-eyebrow">QUESTIONS</p>
          <h2 className="hf-title">Plain answers, <span>in writing.</span></h2>
          <p className="hf-sub">The things clients ask us most. Can&apos;t find yours? Our AI assistant answers in seconds.</p>

          <AskAiCard />

          <div className="hf-links">
            <a href="https://wa.me/917539907704" target="_blank" rel="noopener noreferrer" className="hf-wa"><span className="hf-dot" />WhatsApp us</a>
            <a href="/company#faq" className="hf-all">All {total} questions →</a>
          </div>
        </div>

        <ol className="hf-list">
          {faqs.map((f, i) => {
            const on = open === i;
            return (
              <li key={f.q} className={`hf-card${on ? ' is-open' : ''}`} style={{ '--i': i }}>
                <button type="button" className="hf-q" aria-expanded={on} onClick={() => setOpen(on ? -1 : i)}>
                  <span aria-hidden="true" className="hf-icon">{iconFor(f.q)}</span>
                  <span className="hf-q-text">{f.q}</span>
                  <span aria-hidden="true" className="hf-toggle">+</span>
                </button>
                <div className="hf-a" role="region" aria-hidden={!on}>
                  <div><p>{f.a}</p></div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** "Ask our AI assistant" card — opens the site assistant, optionally asking a question. */
export function AskAiCard({ chips = ASK, status = 'Online · knows our services, prices & process' }) {
  return (
    <div className="hf-ai">
      <span aria-hidden="true" className="hf-ai-orb" />
      <div className="hf-ai-head">
        <span aria-hidden="true" className="hf-ai-icon">smart_toy</span>
        <div>
          <p className="hf-ai-title">Ask our AI assistant</p>
          <p className="hf-ai-status"><span />{status}</p>
        </div>
      </div>
      <button type="button" className="hf-ai-input" onClick={() => ask('')}>
        <span>Ask anything…</span>
        <span aria-hidden="true" className="hf-ai-send">send</span>
      </button>
      <div className="hf-ai-chips">
        {chips.map((q) => <button key={q} type="button" onClick={() => ask(q)}>{q}</button>)}
      </div>
    </div>
  );
}

/** Icon for a question, chosen from its wording. */
export { iconFor };
