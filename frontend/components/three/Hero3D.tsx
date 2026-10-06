'use client';

import { useEffect, useRef, useState } from 'react';
import type { HeroScene } from './heroScene';

/**
 * Decides whether this device gets the real-time 3D hero, then loads three.js lazily (after
 * the page is idle) so it never competes with the first paint. Phones, low-memory devices,
 * data-saver and reduced-motion users keep the static fallback rendered underneath.
 */
function canRun3D(): boolean {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  if (nav.connection?.saveData || /(^|-)2g$/.test(nav.connection?.effectiveType || '')) return false;
  if ((nav.deviceMemory ?? 8) < 4 || (navigator.hardwareConcurrency ?? 8) < 4) return false;
  if (window.innerWidth < 768 && matchMedia('(pointer: coarse)').matches) return false;
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

export function Hero3D({ onReady }: { onReady?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canRun3D()) return;
    let scene: HeroScene | null = null;
    let cancelled = false;
    const host = canvasRef.current!.parentElement!;

    const onPointer = (e: PointerEvent) => {
      scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    const onScroll = () => {
      const r = host.getBoundingClientRect();
      scene?.setScroll(Math.min(Math.max(-r.top / Math.max(r.height, 1), 0), 1));
    };
    const io = new IntersectionObserver(([e]) => scene?.setActive(e.isIntersecting), { threshold: 0 });

    const load = () => import('./heroScene').then(({ createHeroScene }) => {
      if (cancelled || !canvasRef.current) return;
      try {
        scene = createHeroScene(canvasRef.current, { onFirstFrame: () => { setReady(true); onReady?.(); } });
      } catch {
        return; // WebGL context failed: the fallback stays.
      }
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      io.observe(host);
      onScroll();
    });
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number; cancelIdleCallback?: (h: number) => void };
    const viaIdle = typeof w.requestIdleCallback === 'function';
    const handle = viaIdle ? w.requestIdleCallback!(load, { timeout: 2000 }) : window.setTimeout(load, 600);

    return () => {
      cancelled = true;
      if (viaIdle) w.cancelIdleCallback?.(handle); else clearTimeout(handle);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
      scene?.dispose();
    };
  }, [onReady]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full transition-opacity duration-[1400ms] ease-out ${ready ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
