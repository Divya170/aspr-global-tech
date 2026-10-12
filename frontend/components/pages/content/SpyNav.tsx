'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReduced } from '@/components/interactive/hooks';
import './content.css';

type Item = { id: string; label: string; count?: number };

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * "On this page" navigation with scroll-spy. Plain anchor links (they work without JavaScript);
 * the section being read is highlighted and a rail fills up to it. Only classes change, so focus
 * never moves. `chips` turns it into a horizontal strip with a progress line below lg.
 */
export function SpyNav({ items, label, title, chips = false, numbered = false, className = '' }: {
  items: Item[]; label: string; title?: string; chips?: boolean; numbered?: boolean; className?: string;
}) {
  const [active, setActive] = useState(-1);
  const [fill, setFill] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const key = items.map((i) => i.id).join('|');

  useEffect(() => {
    const targets = key.split('|').map((id) => document.getElementById(id));
    let raf = 0;
    const update = () => {
      raf = 0;
      // A section counts as "being read" once its heading passes 30% down the viewport.
      const line = Math.max(window.innerHeight * 0.3, 240);
      let a = 0;
      targets.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) a = i; });
      setActive(a);
      const li = listRef.current?.children[a] as HTMLElement | undefined;
      const rail = railRef.current;
      if (li && rail && rail.offsetHeight) {
        const r = li.getBoundingClientRect();
        setFill(Math.max(0, r.top + r.height / 2 - rail.getBoundingClientRect().top));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [key]);

  // In the horizontal strip, keep the active chip in view (scrolls the strip only, never the page).
  useEffect(() => {
    const list = listRef.current;
    const li = list?.children[active] as HTMLElement | undefined;
    if (!list || !li || list.scrollWidth <= list.clientWidth + 1) return;
    const lr = list.getBoundingClientRect(), r = li.getBoundingClientRect();
    const behavior: ScrollBehavior = prefersReduced() ? 'auto' : 'smooth';
    if (r.left < lr.left + 8) list.scrollBy({ left: r.left - lr.left - 8, behavior });
    else if (r.right > lr.right - 40) list.scrollBy({ left: r.right - lr.right + 40, behavior });
  }, [active]);

  return (
    <nav aria-label={label} className={`ct-spy ${chips ? 'ct-spy--chips' : ''} ${className}`}>
      {title && <p className="eyebrow ct-spy-title">{title}</p>}
      <div className="ct-spy-body">
        <span ref={railRef} className="ct-spy-rail" aria-hidden="true"><span style={{ height: fill }} /></span>
        <ol ref={listRef} className="ct-spy-list">
          {items.map((it, i) => (
            <li key={it.id} className={i === active ? 'is-active' : i < active ? 'is-past' : ''}>
              <a href={`#${it.id}`} className="ct-spy-link" aria-current={i === active ? 'location' : undefined}>
                <span className="ct-spy-dot" aria-hidden="true" />
                {numbered && <span className="ct-spy-n" aria-hidden="true">{pad(i + 1)}</span>}
                <span className="ct-spy-label">{it.label}</span>
                {it.count !== undefined && <span className="ct-spy-count">{it.count}</span>}
              </a>
            </li>
          ))}
        </ol>
      </div>
      {chips && <span className="ct-spy-bar" aria-hidden="true"><span style={{ width: `${((active + 1) / Math.max(items.length, 1)) * 100}%` }} /></span>}
    </nav>
  );
}
