'use client';

// Home hero: a rotating "We build ___" line and the right-hand visual — a glowing stage with a
// self-playing assistant chat, floating proof badges and orbiting service icons. Decorative
// only (aria-hidden); clicking the chat opens the real assistant.

import { useEffect, useState } from 'react';

const WORDS = ['Websites', 'Mobile Apps', 'SaaS Platforms', 'AI Chatbots', 'Games', 'Brands'];

export function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="hv-rot">
      We build{' '}
      <span className="hv-rot-box" aria-live="polite">
        <span key={WORDS[i]} className="hv-rot-word">{WORDS[i]}</span>
      </span>
    </p>
  );
}

const CHAT = [
  { me: true, text: 'Can you build an app for my clinic?' },
  { me: false, text: 'Yes! Online booking, reminders and payments — iPhone + Android from one codebase.' },
  { me: true, text: 'How long would it take?' },
  { me: false, text: 'Typically 8–16 weeks. Want a fixed quote?' },
];

const ORBIT = ['language', 'smartphone', 'smart_toy', 'sports_esports', 'palette', 'travel_explore'];

export default function HeroVisual() {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(CHAT.length); return; }
    const id = setInterval(() => setN((x) => (x >= CHAT.length + 2 ? 0 : x + 1)), 1600);
    return () => clearInterval(id);
  }, []);

  const shown = CHAT.slice(0, Math.min(n, CHAT.length));
  const typing = n < CHAT.length && n > 0 && !CHAT[n].me;

  return (
    <div className="hv" aria-hidden="true">
      <div className="hv-glow" />
      <div className="hv-orbit">
        {ORBIT.map((ic, i) => <span key={ic} style={{ '--a': `${(360 / ORBIT.length) * i}deg` }}><b>{ic}</b></span>)}
      </div>

      <div className="hv-chat" onClick={() => window.dispatchEvent(new CustomEvent('aspr:chat', { detail: {} }))}>
        <div className="hv-chat-head">
          <span className="hv-chat-av">smart_toy</span>
          <div><b>ASPR Assistant</b><small><i />Online now</small></div>
        </div>
        <div className="hv-chat-body">
          {shown.map((m, i) => <p key={i} className={`hv-msg${m.me ? ' is-me' : ''}`}>{m.text}</p>)}
          {typing ? <p className="hv-msg hv-typing"><i /><i /><i /></p> : null}
        </div>
        <div className="hv-chat-input"><span>Ask anything…</span><b>send</b></div>
      </div>

      <div className="hv-badge hv-b1"><b>rocket_launch</b><div><strong>300+</strong><small>projects delivered</small></div></div>
      <div className="hv-badge hv-b2"><b>star</b><div><strong>150+</strong><small>happy clients</small></div></div>
      <div className="hv-badge hv-b3"><b>public</b><div><strong>US &amp; worldwide</strong><small>calls in your time zone</small></div></div>
    </div>
  );
}
