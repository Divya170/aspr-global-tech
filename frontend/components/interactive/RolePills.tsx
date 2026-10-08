'use client';

import { Icon } from '@/components/ui/Icon';
import { useInView } from './hooks';
import './interactive.css';

const ICON: Record<string, string> = {
  'Web engineers': 'code', 'App developers': 'smartphone', 'Game developers': 'gamepad-2', Designers: 'pen-tool',
  'Video editors': 'clapperboard', SEO: 'search', 'Business systems': 'workflow',
};

/** Team disciplines as pills that slide in one after another and fill on hover. */
export function RolePills({ roles, label }: { roles: string[]; label?: string }) {
  const [ref, seen, armed] = useInView<HTMLUListElement>(0.3);
  return (
    <ul ref={ref} aria-label={label} className={`flex flex-wrap gap-2 ${seen ? 'is-seen' : ''} ${armed ? 'is-armed' : ''}`}>
      {roles.map((r, i) => (
        <li key={r} className="ix-role" style={{ '--i': i } as React.CSSProperties}>
          <span className="ix-role-icon" aria-hidden="true"><Icon name={ICON[r] || 'sparkles'} size={14} /></span>{r}
        </li>
      ))}
    </ul>
  );
}
