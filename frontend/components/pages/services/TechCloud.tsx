'use client';

import { useState, type CSSProperties } from 'react';
import { useInView } from '@/components/interactive/hooks';
import type { Technology } from '@/lib/types';
import './services.css';

/** Accent per technology group (matches the stack explorer on /technologies). */
const TONE: Record<string, string> = {
  frontend: 'var(--color-tone-blue)', backend: 'var(--color-tone-teal)', database: 'var(--color-tone-amber)', mobile: 'var(--color-tone-purple)', '3d': 'var(--color-tone-pink)', infrastructure: 'var(--color-tone-sky)', design: 'var(--color-tone-orange)', platforms: 'var(--color-tone-green)',
};
/** "Next.js" → "NE", "React Three Fiber" → "RT", "C#" → "C#". */
const mono = (name: string) => {
  const words = name.replace(/[^\w#+ ]/g, ' ').trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.replace(/[^\w#+]/g, '').slice(0, 2)).toUpperCase();
};

/** Technology chips that pop in one by one; hovering or focusing one lights up every tool in its group. */
export function TechCloud({ items }: { items: Technology[] }) {
  const [ref, seen, armed] = useInView<HTMLUListElement>(0.2);
  const [group, setGroup] = useState<string | null>(null);
  return (
    <ul ref={ref} onMouseLeave={() => setGroup(null)} className={`svx-tech ${group ? 'has-pick' : ''} ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''}`}>
      {items.map((t, i) => (
        <li
          key={t.id} tabIndex={0} style={{ '--i': i, '--tone': TONE[t.group] || 'var(--color-brand)' } as CSSProperties}
          className={`svx-chip ${group === t.group ? 'is-match' : ''}`}
          onMouseEnter={() => setGroup(t.group)} onFocus={() => setGroup(t.group)} onBlur={() => setGroup(null)}
        >
          <span className="svx-chip-mono" aria-hidden="true">{mono(t.name)}</span>{t.name}
        </li>
      ))}
    </ul>
  );
}
