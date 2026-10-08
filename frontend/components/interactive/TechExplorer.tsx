'use client';

import { useEffect, useId, useRef } from 'react';
import { Box, Cloud, Code2, Database, Layers, Palette, Server, Smartphone, type LucideIcon } from 'lucide-react';
import { TECH_GROUP_LABELS } from '@/components/sections/TechGrid';
import type { Technology } from '@/lib/types';
import { useAutoCycle, useInView } from './hooks';
import './interactive.css';

const CYCLE = 3200;
const GROUP_ICON: Record<string, LucideIcon> = {
  frontend: Code2, backend: Server, database: Database, mobile: Smartphone, '3d': Box, infrastructure: Cloud, design: Palette, platforms: Layers,
};
/** Badge colours per group (background, text) on the dark theme. */
const TONE: Record<string, [string, string]> = {
  frontend: ['rgb(65 112 255 / 0.18)', '#8aa6ff'], backend: ['rgb(94 234 212 / 0.14)', '#5eead4'], database: ['rgb(251 191 36 / 0.14)', '#fbbf24'],
  mobile: ['rgb(139 92 246 / 0.18)', '#b9a2ff'], '3d': ['rgb(236 72 153 / 0.16)', '#f9a8d4'], infrastructure: ['rgb(56 189 248 / 0.15)', '#7dd3fc'],
  design: ['rgb(251 146 60 / 0.15)', '#fdba74'], platforms: ['rgb(52 211 153 / 0.15)', '#6ee7b7'],
};
const ORDER = Object.keys(TECH_GROUP_LABELS);

/** "Next.js" → "NE", "React Three Fiber" → "RT", "C#" → "C#". */
const mono = (name: string) => {
  const words = name.replace(/[^\w#+ ]/g, ' ').trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.replace(/[^\w#+]/g, '').slice(0, 2)).toUpperCase();
};

/**
 * The stack as an explorer: category tabs cycle on their own (with a timer bar) until the
 * visitor picks one, the tiles pop in, and a marquee of every technology runs underneath.
 * Keyboard: arrow keys move between tabs.
 */
export function TechExplorer({ technologies, groups }: { technologies: Technology[]; groups?: string[] }) {
  const uid = useId();
  const by = new Map<string, Technology[]>();
  for (const t of technologies) by.set(t.group, [...(by.get(t.group) || []), t]);
  const list = ORDER.filter((g) => by.has(g) && (!groups || groups.includes(g)));
  const [ref, seen] = useInView<HTMLDivElement>(0.25);
  const { active, paused, pick, resume } = useAutoCycle(list.length, seen, CYCLE);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Keep the active tab visible in the scrollable tab strip (phones), without scrolling the page.
  useEffect(() => {
    const strip = tabsRef.current;
    const tab = strip?.children[active] as HTMLElement | undefined;
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
  }, [active]);
  const g = list[active] || list[0];
  if (!g) return null;
  const Icon = GROUP_ICON[g] || Layers;
  const all = list.flatMap((k) => by.get(k)!);

  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (active + d + list.length) % list.length;
    pick(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  };

  return (
    <div ref={ref} className="ix-explorer" style={{ '--cycle': `${CYCLE}ms` } as React.CSSProperties} onMouseLeave={resume}>
      <div ref={tabsRef} role="tablist" aria-label="Technology categories" className="ix-tabs relative" onKeyDown={onKey}>
        {list.map((k, i) => {
          const TabIcon = GROUP_ICON[k] || Layers;
          const on = i === active;
          return (
            <button
              key={k} id={`${uid}-tab-${i}`} type="button" role="tab" aria-selected={on} aria-controls={`${uid}-panel`} tabIndex={on ? 0 : -1}
              className="ix-tab" onClick={() => pick(i)} onMouseEnter={() => pick(i)}
            >
              <TabIcon aria-hidden="true" size={16} />{TECH_GROUP_LABELS[k]}<span className="ix-tab-count">{by.get(k)!.length}</span>
              {on && !paused && seen && <span key={`t-${active}`} className="ix-tab-timer" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${active}`} className="ix-panel">
        <div className="ix-panel-head">
          <span className="ix-panel-icon" aria-hidden="true"><Icon size={24} /></span>
          <h3 className="font-display text-xl font-semibold tracking-tight text-text">{TECH_GROUP_LABELS[g]}</h3>
        </div>
        <ul key={g} className="ix-tiles">
          {by.get(g)!.map((t, i) => (
            <li key={t.id} className="ix-tile" style={{ '--i': i } as React.CSSProperties}>
              <span className="ix-badge" aria-hidden="true" style={{ background: TONE[g]?.[0], color: TONE[g]?.[1] }}>{mono(t.name)}</span>
              <span className="text-[0.95rem] font-medium text-text">{t.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="ix-marquee" aria-hidden="true">
        <div className="ix-marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="ix-marquee-set">
              {all.map((t) => (
                <span key={`${copy}-${t.id}`} className="ix-marquee-item">
                  <span className="ix-marquee-dot" style={{ background: TONE[t.group]?.[0], color: TONE[t.group]?.[1] }}>{mono(t.name)}</span>{t.name}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
