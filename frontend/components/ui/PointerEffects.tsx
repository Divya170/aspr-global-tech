'use client';

import { useEffect } from 'react';

/**
 * One document-level pointer listener for every cursor effect on the page:
 *  - [data-spotlight]: sets --mx/--my for the highlight; "tilt" also tilts the card slightly;
 *  - [data-magnetic]: pulls the element toward the cursor.
 * Mouse only, and nothing moves for reduced-motion users. Renders nothing.
 */
export function PointerEffects() {
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    let card: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;

    const release = (el: HTMLElement | null) => { if (el) el.style.transform = ''; };

    const apply = () => {
      frame = 0;
      const e = last!;
      const target = e.target instanceof Element ? e.target : null;
      const nextCard = target?.closest<HTMLElement>('[data-spotlight]') ?? null;
      const nextMagnet = target?.closest<HTMLElement>('[data-magnetic]') ?? null;
      if (card && card !== nextCard && card.dataset.spotlight === 'tilt') release(card);
      if (magnet && magnet !== nextMagnet) release(magnet);
      card = nextCard;
      magnet = nextMagnet;
      if (card) {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        if (card.dataset.spotlight === 'tilt' && !still.matches) {
          card.style.transform = `perspective(900px) rotateX(${(y / r.height - 0.5) * -4}deg) rotateY(${(x / r.width - 0.5) * 5}deg)`;
        }
      }
      if (magnet && !still.matches) {
        const r = magnet.getBoundingClientRect();
        const k = Number(magnet.dataset.magnetic) || 0.25;
        magnet.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * k}px, ${(e.clientY - r.top - r.height / 2) * k}px)`;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => { if (card?.dataset.spotlight === 'tilt') release(card); release(magnet); card = magnet = null; };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return null;
}
