'use client';

import { useCountUp, useInView } from './hooks';
import { Icon } from '@/components/ui/Icon';
import './interactive.css';

export interface StatItem { value: string; label: string; icon: string }

/** "300+" → 300 with a plus; "10–15" → a range; anything else is shown as written. */
const parse = (v: string) => {
  const m = String(v).match(/^(\d+)(?:\s*[–-]\s*(\d+))?(\+)?$/);
  return m ? { from: Number(m[1]), to: m[2] ? Number(m[2]) : null, plus: !!m[3] } : null;
};

function Stat({ s, run, i }: { s: StatItem; run: boolean; i: number }) {
  const p = parse(s.value);
  const a = useCountUp(p?.from ?? 0, run);
  const b = useCountUp(p?.to ?? 0, run);
  return (
    <li className="ix-stat" style={{ '--i': i } as React.CSSProperties}>
      <span className="ix-stat-icon" aria-hidden="true"><Icon name={s.icon} size={21} /></span>
      <p className="ix-stat-num">
        {/* Screen readers get the final figure; the counting digits are decorative. */}
        <span className="sr-only">{s.value}</span>
        <span aria-hidden="true">{p ? <>{a}{p.to ? <>–{b}</> : null}{p.plus ? <span className="ix-plus">+</span> : null}</> : s.value}</span>
      </p>
      <p className="ix-stat-label">{s.label}</p>
    </li>
  );
}

/** Stat tiles that count up on first view, over slowly drifting colour orbs. */
export function StatBand({ stats, pills = [], className = '' }: { stats: StatItem[]; pills?: { k: string; v: string }[]; className?: string }) {
  const [ref, seen, armed] = useInView<HTMLDivElement>(0.25);
  return (
    <div ref={ref} className={`ix-band p-3 sm:p-4 ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''} ${className}`}>
      <div aria-hidden="true" className="ix-orb ix-orb-1" />
      <div aria-hidden="true" className="ix-orb ix-orb-2" />
      <div aria-hidden="true" className="ix-orb ix-orb-3" />
      <ul className="ix-stats">
        {stats.map((s, i) => <Stat key={s.label} s={s} run={seen} i={i} />)}
      </ul>
      {pills.length > 0 && (
        <dl className="ix-pills px-1 pb-1">
          {pills.map((p) => (
            <div key={p.k} className="ix-pill"><dt className="ix-pill-k">{p.k}</dt><dd>{p.v}</dd></div>
          ))}
        </dl>
      )}
    </div>
  );
}
