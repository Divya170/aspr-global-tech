'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Bot, SendHorizontal } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import './hero.css';

/*
 * Home hero pieces from main's identity: the rotating "We build ___" line and the stage visual
 * (glow, orbiting service icons, a self-playing assistant chat and floating proof badges).
 * Both settle to a static state for reduced motion.
 */

const WORDS = ['Websites', 'Mobile Apps', 'SaaS Platforms', 'AI Chatbots', 'Games', 'Brands'];

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "We build ___" with the word swapping every 2.2s. Screen readers get the whole list once. */
export function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return;
    const id = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="hv-rot">
      <span aria-hidden="true">We build</span>
      <span className="hv-rot-box" aria-hidden="true"><span key={WORDS[i]} className="hv-rot-word">{WORDS[i]}</span></span>
      <span className="sr-only">We build {WORDS.slice(0, -1).join(', ')} and {WORDS[WORDS.length - 1]}.</span>
    </p>
  );
}

const CHAT = [
  { me: true, text: 'Can you build an app for my clinic?' },
  { me: false, text: 'Yes! Online booking, reminders and payments — iPhone + Android from one codebase.' },
  { me: true, text: 'How long would it take?' },
  { me: false, text: 'Typically 8–16 weeks. Want a fixed quote?' },
];

const ORBIT = ['globe', 'smartphone', 'bot', 'gamepad-2', 'palette', 'search'];

export interface HeroBadge { icon: string; strong: string; small: string }

/** Decorative (aria-hidden); clicking the chat opens the real assistant, which has its own launcher. */
export function HeroStage({ badges }: { badges: HeroBadge[] }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reducedMotion()) { setN(CHAT.length); return; }
    const id = setInterval(() => setN((x) => (x >= CHAT.length + 2 ? 0 : x + 1)), 1600);
    return () => clearInterval(id);
  }, []);
  const shown = CHAT.slice(0, Math.min(n, CHAT.length));
  const typing = n > 0 && n < CHAT.length && !CHAT[n].me;

  return (
    <div className="hv" aria-hidden="true">
      <div className="hv-glow" />
      <div className="hv-orbit">
        {ORBIT.map((ic, i) => (
          <span key={ic} style={{ '--a': `${(360 / ORBIT.length) * i}deg` } as CSSProperties}><b><Icon name={ic} size={22} /></b></span>
        ))}
      </div>

      <div className="hv-chat" onClick={() => window.dispatchEvent(new CustomEvent('aspr:chat', { detail: {} }))}>
        <div className="hv-chat-head">
          <span className="hv-chat-av"><Bot size={20} /></span>
          <div><b>ASPR Assistant</b><small><i />Online now</small></div>
        </div>
        <div className="hv-chat-body">
          {shown.map((m, i) => <p key={i} className={`hv-msg${m.me ? ' is-me' : ''}`}>{m.text}</p>)}
          {typing && <p className="hv-msg hv-typing"><i /><i /><i /></p>}
        </div>
        <div className="hv-chat-input"><span>Ask anything…</span><b><SendHorizontal size={16} /></b></div>
      </div>

      {badges.slice(0, 3).map((b, i) => (
        <div key={b.strong} className={`hv-badge hv-b${i + 1}`}>
          <b><Icon name={b.icon} size={20} /></b>
          <div><strong>{b.strong}</strong><small>{b.small}</small></div>
        </div>
      ))}
    </div>
  );
}
