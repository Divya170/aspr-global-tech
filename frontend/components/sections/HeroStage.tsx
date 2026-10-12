'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Bot, SendHorizontal } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { useLive } from '@/lib/live';
import './hero.css';

/*
 * Home hero pieces from main's identity: the rotating "We build ___" line and the stage visual
 * (glow, orbiting service icons, a self-playing assistant chat and floating proof badges).
 * Both settle to a static state for reduced motion.
 */

/** Short hero label per published service slug. Only services the API returns as published are shown. */
const WORD_FOR: Record<string, string> = {
  'website-development': 'Websites', '3d-website-development': '3D Websites', 'web-application-development': 'Web Apps',
  'custom-software-development': 'Custom Software', 'mobile-app-development': 'Mobile Apps', 'ui-ux-design': 'UI/UX Design',
  'business-automation': 'Automation', 'branding-digital-design': 'Brands',
};

export interface HeroService { slug: string; icon: string }
const wordsFor = (services: HeroService[]) => services.map((s) => WORD_FOR[s.slug]).filter(Boolean);

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "We build ___" with the word swapping every 2.2s, over the published services. Screen readers get the whole list once. */
export function RotatingWord({ services }: { services: HeroService[] }) {
  const WORDS = wordsFor(services);
  const [i, setI] = useState(0);
  const live = useLive();
  useEffect(() => {
    if (!live || reducedMotion() || WORDS.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2200);
    return () => clearInterval(id);
  }, [live, WORDS.length]);
  if (!WORDS.length) return null;
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

export interface HeroBadge { icon: string; strong: string; small: string }

/** Decorative (aria-hidden); clicking the chat opens the real assistant, which has its own launcher. */
export function HeroStage({ badges, services }: { badges: HeroBadge[]; services: HeroService[] }) {
  // Orbit icons: one per published service (their CMS icons), at most eight.
  const orbit = [...new Set(services.map((s) => s.icon))].slice(0, 8);
  // Static (the full chat) until the visitor interacts; then the conversation plays on a loop.
  const [n, setN] = useState(CHAT.length);
  const live = useLive();
  useEffect(() => {
    if (!live || reducedMotion()) return;
    setN(0);
    const id = setInterval(() => setN((x) => (x >= CHAT.length + 2 ? 0 : x + 1)), 1600);
    return () => clearInterval(id);
  }, [live]);
  const shown = CHAT.slice(0, Math.min(n, CHAT.length));
  const typing = n > 0 && n < CHAT.length && !CHAT[n].me;

  return (
    <div className="hv" aria-hidden="true">
      <div className="hv-glow" />
      <div className="hv-orbit">
        {orbit.map((ic, i) => (
          <span key={ic} style={{ '--a': `${(360 / orbit.length) * i}deg` } as CSSProperties}><b><Icon name={ic} size={22} /></b></span>
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
