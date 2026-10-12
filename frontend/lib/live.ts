'use client';

import { useEffect, useState } from 'react';

/*
 * Decorative motion (orbits, glows, marquees, auto-cycling cards, count-ups) starts on the visitor's
 * first interaction instead of during load. Until then it costs nothing: no per-frame style, layout
 * or paint work competing with the first render. `html.fx-live` is the CSS switch (effects.css).
 */

const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;
let live = false;
let armed = false;
const subscribers = new Set<() => void>();

function start() {
  if (live) return;
  live = true;
  document.documentElement.classList.add('fx-live');
  for (const e of EVENTS) window.removeEventListener(e, start, true);
  for (const fn of subscribers) fn();
  subscribers.clear();
}

/** Listens for the first interaction (once per page load). */
export function armLive() {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  for (const e of EVENTS) window.addEventListener(e, start, { capture: true, passive: true });
}

/** True once the visitor has interacted with the page. */
export function useLive() {
  const [on, setOn] = useState(live);
  useEffect(() => {
    if (live) { setOn(true); return; }
    armLive();
    const fn = () => setOn(true);
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
  }, []);
  return on;
}
