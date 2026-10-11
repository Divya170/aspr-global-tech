'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { PortfolioCard } from '@/components/sections/PortfolioCard';
import type { ProjectCard } from '@/lib/types';

type Category = { id: number; slug: string; name: string };

/**
 * Client-side category filter for the portfolio. The active category lives in the URL
 * (?category=slug) so filtered views can be shared and survive reloads.
 */
export function PortfolioGrid({ categories, items }: { categories: Category[]; items: ProjectCard[] }) {
  const pathname = usePathname();
  const params = useSearchParams();

  // Only offer categories that actually have projects.
  const cats = useMemo(() => categories.filter((c) => items.some((p) => p.category?.id === c.id)), [categories, items]);
  const requested = params.get('category') || '';
  const active = cats.some((c) => c.slug === requested) ? requested : '';
  const shown = active ? items.filter((p) => p.category?.slug === active) : items;

  const select = (slug: string) => {
    const next = new URLSearchParams(params.toString());
    if (slug) next.set('category', slug); else next.delete('category');
    const qs = next.toString();
    // Shallow URL update: Next keeps useSearchParams in sync with history.replaceState, so the
    // filter applies instantly without a server round trip or scroll jump.
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  };

  const filters = [{ slug: '', name: 'All', count: items.length }, ...cats.map((c) => ({ slug: c.slug, name: c.name, count: items.filter((p) => p.category?.id === c.id).length }))];
  const activeName = filters.find((f) => f.slug === active)?.name || 'All';

  return (
    <div>
      {cats.length > 1 && (
        <div role="group" aria-label="Filter projects by category" className="-mx-4 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {filters.map((f) => {
              const on = f.slug === active;
              return (
                <button
                  key={f.slug || 'all'} type="button" aria-pressed={on} onClick={() => select(f.slug)}
                  className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 font-mono text-xs uppercase tracking-[0.14em] transition-[color,background,border-color,box-shadow,transform] duration-300 ${
                    on ? 'border-transparent bg-gradient-to-r from-brand to-brand-strong text-white shadow-[0_12px_30px_-12px_color-mix(in_srgb,var(--color-brand)_54%,transparent)]' : 'border-line-strong bg-surface text-muted hover:-translate-y-0.5 hover:border-brand-soft/40 hover:text-text'
                  }`}
                >
                  {f.name}
                  <span className={`grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 tabular-nums ${on ? 'bg-white/20 text-white' : 'bg-surface-3 text-subtle'}`}>{f.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {`Showing ${shown.length} ${shown.length === 1 ? 'project' : 'projects'}${active ? ` in ${activeName}` : ''}`}
      </p>

      <ul key={active || 'all'} className="mt-10 grid animate-fade-up gap-5 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((p, i) => (
          <li key={p.slug} className={`[&>article]:h-full ${i === 0 && shown.length > 2 ? 'md:col-span-2 lg:row-span-2' : ''}`}>
            <PortfolioCard project={p} priority={i < 2} large={i === 0 && shown.length > 2} />
          </li>
        ))}
      </ul>
    </div>
  );
}
