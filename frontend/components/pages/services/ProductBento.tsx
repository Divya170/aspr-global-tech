import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import type { ServiceDetail } from '@/lib/types';
import './services.css';

/**
 * Ready-made products as a checkerboard bento: on desktop each row pairs a wide tile with a
 * narrow one, alternating sides; an odd last product spans the full row.
 */
export function ProductBento({ products }: { products: ServiceDetail['products'] }) {
  const n = products.length;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((p, i) => {
        const full = i === n - 1 && n % 2 === 1;
        const wide = full || (Math.floor(i / 2) % 2 === 0 ? i % 2 === 0 : i % 2 === 1);
        return (
          <Reveal key={p.name} delay={(i % 2) * 70} className={full ? 'md:col-span-2 lg:col-span-3' : wide ? 'lg:col-span-2' : ''}>
            <SpotlightCard className={`panel svx-product fx-border @container group relative flex h-full flex-col overflow-hidden p-7 sm:p-8 ${wide ? 'is-wide' : ''}`}>
              <span aria-hidden="true" className="svx-product-n">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex items-center gap-4 pr-16">
                <span className="fx-icon grid size-12 shrink-0 place-items-center rounded-xl border border-line-strong bg-gradient-to-br from-brand/20 to-accent/10 text-brand"><Icon name={p.icon} size={22} /></span>
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-text">{p.name}</h3>
                  {p.tag && <p className="text-sm text-muted">{p.tag}</p>}
                </div>
              </div>
              {p.features && p.features.length > 0 && (
                <ul className={`mt-7 grid flex-1 content-start text-[0.95rem] text-muted ${wide ? 'gap-2.5 @lg:grid-cols-2' : 'gap-3'}`}>
                  {p.features.map((f, j) => (
                    <li key={f} className={`svx-feat flex gap-2.5 ${wide ? 'svx-feat-tile' : ''}`} style={{ '--j': j } as CSSProperties}>
                      <Check aria-hidden="true" size={16} className="mt-1 shrink-0 text-success" />{f}
                    </li>
                  ))}
                </ul>
              )}
              {p.bestFor && <p className="mt-7 border-t border-line pt-4 text-sm text-subtle"><span className="text-muted">Best for:</span> {p.bestFor}</p>}
            </SpotlightCard>
          </Reveal>
        );
      })}
    </div>
  );
}
