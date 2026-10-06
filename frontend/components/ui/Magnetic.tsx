'use client';

import { useRef, type ReactNode } from 'react';

/**
 * Pulls its child a few pixels toward the cursor. Fine pointers only; does nothing for touch
 * or reduced-motion users.
 */
export function Magnetic({ children, strength = 0.25, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const enabled = () => typeof window !== 'undefined' && matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <span
      ref={ref}
      className={`inline-flex transition-transform duration-500 ease-[var(--ease-out-expo)] will-change-transform ${className}`}
      onPointerMove={(e) => {
        if (!enabled() || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        ref.current.style.transform = `translate(${x}px, ${y}px)`;
      }}
      onPointerLeave={() => { if (ref.current) ref.current.style.transform = ''; }}
    >
      {children}
    </span>
  );
}
