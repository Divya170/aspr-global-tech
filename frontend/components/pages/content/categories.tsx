import type { CSSProperties } from 'react';
import { BookOpen, Code2, Palette, TrendingUp, Users, Workflow, type LucideIcon } from 'lucide-react';
import './content.css';

/** Insight categories → icon and accent colour. New categories fall back to the brand blue. */
const CATEGORIES: Record<string, { icon: LucideIcon; color: string }> = {
  Build: { icon: Code2, color: 'var(--color-tone-blue)' },
  Brand: { icon: Palette, color: 'var(--color-tone-pink)' },
  Grow: { icon: TrendingUp, color: 'var(--color-tone-teal)' },
  Process: { icon: Workflow, color: 'var(--color-tone-purple)' },
  Studio: { icon: Users, color: 'var(--color-tone-amber)' },
};

export const category = (name?: string | null) => CATEGORIES[name || ''] || { icon: BookOpen, color: 'var(--color-brand)' };

/** Sets the --c accent colour for a category. */
export const catStyle = (name?: string | null) => ({ '--c': category(name).color }) as CSSProperties;

/** Category name as a tinted chip with its icon. */
export function CategoryChip({ name, className = '' }: { name: string; className?: string }) {
  const { icon: I } = category(name);
  return <span className={`ct-cat ${className}`} style={catStyle(name)}><I aria-hidden="true" strokeWidth={2} />{name}</span>;
}

/** Decorative orbit with the category icon in a gradient tile (aria-hidden). */
export function CategoryOrbit({ name, className = '' }: { name?: string | null; className?: string }) {
  const { icon: I } = category(name);
  return (
    <span aria-hidden="true" className={`ct-orbit ${className}`} style={catStyle(name)}>
      <i /><i />
      <span className="ct-emblem"><I strokeWidth={1.6} /></span>
    </span>
  );
}
