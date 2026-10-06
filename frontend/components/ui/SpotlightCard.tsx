'use client';

import { useRef, type ElementType, type ReactNode } from 'react';

/**
 * Card with a soft highlight that follows the cursor and an optional subtle 3D tilt.
 * Pure CSS variables; no re-renders on pointer move.
 */
export function SpotlightCard({ children, className = '', tilt = false, as: As = 'div' }: { children: ReactNode; className?: string; tilt?: boolean; as?: ElementType }) {
  const ref = useRef<HTMLElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty('--mx', `${x}px`);
    el.style.setProperty('--my', `${y}px`);
    if (tilt && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.transform = `perspective(900px) rotateX(${((y / r.height) - 0.5) * -4}deg) rotateY(${((x / r.width) - 0.5) * 5}deg)`;
    }
  };
  const leave = () => { if (ref.current && tilt) ref.current.style.transform = ''; };
  return (
    <As ref={ref} onPointerMove={move} onPointerLeave={leave} className={`spotlight transition-transform duration-500 ease-[var(--ease-out-expo)] ${className}`}>
      {children}
    </As>
  );
}
