'use client';

import { useEffect, useRef, useState } from 'react';

export const prefersReduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * `seen` turns true once the element has scrolled into view (never resets). `armed` turns true
 * on mount: entrance animations only hide content while armed, so the server-rendered HTML is
 * always fully visible, even before (or without) JavaScript.
 */
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return; }
    setArmed(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen, armed] as const;
}

/**
 * Counts from 0 to `to` (ease-out) once `run` turns true. Starts at `to`, so server HTML and
 * reduced-motion users always see the real figure; the count only plays when animating.
 */
export function useCountUp(to: number, run: boolean, duration = 1400) {
  const [n, setN] = useState(to);
  useEffect(() => {
    if (!run) return;
    if (prefersReduced()) { setN(to); return; }
    let raf = 0;
    let start: number | undefined;
    const step = (ts: number) => {
      start ??= ts;
      const p = Math.min(1, (ts - start) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, run, duration]);
  return n;
}

/**
 * Steps an "active" index through `count` items every `ms` while `run` is true and the user
 * isn't interacting. Hover/focus pick an item and pause the cycle; leaving resumes it.
 * Never auto-plays for reduced-motion users.
 */
export function useAutoCycle(count: number, run: boolean, ms = 2800) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!run || paused || count < 2 || prefersReduced()) return;
    const id = setInterval(() => setActive((a) => (a + 1) % count), ms);
    return () => clearInterval(id);
  }, [run, paused, count, ms]);
  const pick = (i: number) => { setPaused(true); setActive(i); };
  const resume = () => setPaused(false);
  return { active, paused, pick, resume, setActive };
}

/** Pointer position inside an element as --mx/--my (%), plus a small tilt as --rx/--ry. */
export function tiltHandlers(strength = 1) {
  return {
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      if (e.pointerType !== 'mouse' || prefersReduced()) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${x * 100}%`);
      el.style.setProperty('--my', `${y * 100}%`);
      el.style.setProperty('--rx', `${(0.5 - y) * 8 * strength}deg`);
      el.style.setProperty('--ry', `${(x - 0.5) * 10 * strength}deg`);
    },
    onPointerLeave(e: React.PointerEvent<HTMLElement>) {
      e.currentTarget.style.setProperty('--rx', '0deg');
      e.currentTarget.style.setProperty('--ry', '0deg');
    },
  };
}
