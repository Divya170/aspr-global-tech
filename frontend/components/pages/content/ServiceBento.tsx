import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import type { ServiceCard } from '@/lib/types';
import './content.css';

/** Which tiles span two columns so every row of the 4-column bento is full (a zig-zag for the usual eight). */
function wideTiles(n: number) {
  if (n === 8) return new Set([0, 5, 6, 7]);
  const w = (4 - (n % 4)) % 4;
  return new Set(Array.from({ length: Math.min(w, n) }, (_, k) => (k === 0 ? 0 : n - k)));
}

/**
 * Services as a spotlight bento: cursor glow, gradient border on hover, an icon that fills and
 * tilts, an outlined number and a sliding arrow. Wide tiles carry an orbiting emblem.
 */
export function ServiceBento({ services }: { services: ServiceCard[] }) {
  const wide = wideTiles(services.length);
  return (
    <ul className="grid gap-4 [grid-auto-flow:dense] sm:grid-cols-2 lg:grid-cols-4">
      {services.map((s, i) => {
        const w = wide.has(i);
        return (
          <Reveal as="li" key={s.slug} delay={(i % 4) * 50} className={w ? 'sm:col-span-2' : ''}>
            <SpotlightCard className={`ct-svc group fx-border ${w ? 'ct-svc--wide' : ''}`}>
              <span aria-hidden="true" className="ct-svc-num">{s.num}</span>
              {w && <span aria-hidden="true" className="ct-svc-orbit"><i /><i /><span><Icon name={s.icon} size={28} /></span></span>}
              <Link href={`/services/${s.slug}`} className="ct-svc-link rounded-[inherit]">
                <span className="fx-icon grid size-12 place-items-center rounded-xl border border-line-strong bg-gradient-to-br from-brand/20 to-accent/10 text-brand">
                  <Icon name={s.icon} size={22} />
                </span>
                <span className="ct-svc-text">
                  <span className={`block font-medium text-text ${w ? 'font-display text-xl font-semibold sm:text-2xl' : 'text-[1.05rem]'}`}>{s.name}</span>
                  <span className={`mt-1.5 block leading-relaxed text-muted ${w ? 'max-w-md text-[0.95rem]' : 'text-sm'}`}>{s.line}</span>
                </span>
                <ArrowUpRight aria-hidden="true" size={18} className="ct-svc-arrow" />
              </Link>
            </SpotlightCard>
          </Reveal>
        );
      })}
    </ul>
  );
}
