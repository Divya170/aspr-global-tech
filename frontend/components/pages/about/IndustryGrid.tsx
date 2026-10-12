'use client';

import { Briefcase, Building2, Factory, GraduationCap, HeartPulse, Rocket, ShoppingBag, Truck, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { useAutoCycle, useInView } from '@/components/interactive/hooks';
import type { Industry } from '@/lib/types';
import './about.css';

const CYCLE = 2600;
const ICON: [RegExp, LucideIcon][] = [
  [/retail|shop|commerce/i, ShoppingBag], [/health|clinic|medical/i, HeartPulse], [/educat|school|learn/i, GraduationCap],
  [/estate|property/i, Building2], [/manufactur|factory/i, Factory], [/logist|transport|fleet/i, Truck],
  [/hospital|restaurant|hotel|food/i, UtensilsCrossed], [/startup/i, Rocket],
];
const iconFor = (name: string) => ICON.find(([re]) => re.test(name))?.[1] ?? Briefcase;

/**
 * Industries as cards that take turns lighting up: gradient border, the icon fills, the
 * "what we build" chips glow and a bar fills while the card is active. Hovering or focusing a
 * card takes over from the auto-play.
 */
export function IndustryGrid({ items }: { items: Industry[] }) {
  const [ref, seen, armed] = useInView<HTMLUListElement>(0.2);
  const { active, paused, pick, resume } = useAutoCycle(items.length, seen, CYCLE);
  return (
    <ul ref={ref} onMouseLeave={resume} style={{ '--cycle': `${CYCLE}ms` } as React.CSSProperties}
      className={`ind-grid ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''} ${paused ? 'is-paused' : ''}`}>
      {items.map((ind, i) => {
        const I = iconFor(ind.name);
        return (
          <li key={ind.id} tabIndex={0} style={{ '--i': i } as React.CSSProperties}
            className={`ind-card ${i === active ? 'is-active' : ''}`}
            onMouseEnter={() => pick(i)} onFocus={() => pick(i)} onBlur={resume}>
            <div className="flex items-start justify-between">
              <span className="ind-icon" aria-hidden="true"><I size={20} strokeWidth={1.8} /></span>
              <span className="ind-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-text">{ind.name}</h3>
            <p className="ind-problem mt-2 flex-1 text-[0.95rem] leading-relaxed text-muted">{ind.problem}</p>
            {ind.builds.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {ind.builds.map((b, j) => <li key={b} className="ind-chip" style={{ '--j': j } as React.CSSProperties}>{b}</li>)}
              </ul>
            )}
            <span className="ind-bar" aria-hidden="true"><span /></span>
          </li>
        );
      })}
    </ul>
  );
}
