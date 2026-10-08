import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import type { ServiceCard as Service } from '@/lib/types';
import '@/components/pages/services/services.css';

/**
 * Service tile linking to its page: cursor spotlight and tilt, a rotating gradient border, a top
 * sheen, an icon that fills and an arrow button on hover. Switches to two columns when the tile
 * itself is wide (container query). `featured` is the large bento tile on /services.
 */
export function ServiceCard({ service, features, featured = false }: { service: Service; features?: string[]; featured?: boolean }) {
  const list = features?.slice(0, 3) ?? [];
  const href = `/services/${service.slug}`;

  if (featured) {
    return (
      <SpotlightCard className="panel svx-feature fx-border-live group relative h-full overflow-hidden p-1">
        <div aria-hidden="true" className="svx-feature-art"><i /><i /><b /></div>
        <div aria-hidden="true" className="svx-rings"><i /><span><Icon name={service.icon} size={44} strokeWidth={1.5} /></span></div>
        <Link href={href} className="relative flex h-full flex-col rounded-[calc(var(--radius-card)-4px)] p-6 sm:p-9 lg:p-10">
          <span className="font-mono text-xs text-brand-soft">{service.num}</span>
          <div className="mt-auto pt-16 lg:pt-56">
            <h3 className="max-w-md font-display text-3xl font-semibold tracking-tight text-text sm:text-[2.6rem] sm:leading-[1.08]">{service.name}</h3>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">{service.line}</p>
            {list.length > 0 && (
              <ul className="mt-7 grid gap-3 text-[0.95rem] text-muted">
                {list.map((f, j) => (
                  <li key={f} className="svx-card-feat flex items-center gap-3" style={{ '--j': j } as React.CSSProperties}>
                    <Check aria-hidden="true" size={16} strokeWidth={2.2} className="shrink-0 rounded-full bg-brand/15 p-0.5 text-brand-soft" />{f}
                  </li>
                ))}
              </ul>
            )}
            <span className="svx-feature-go mt-9">
              Explore service <span aria-hidden="true" className="svx-card-go"><ArrowUpRight size={16} /></span>
            </span>
          </div>
        </Link>
      </SpotlightCard>
    );
  }

  return (
    <SpotlightCard tilt className="panel fx-border @container group relative h-full overflow-hidden p-1">
      <span aria-hidden="true" className="svx-card-sheen" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-7 -right-2 font-display text-[7rem] font-semibold leading-none tracking-tighter text-transparent opacity-50 transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)] [-webkit-text-stroke:1px_rgb(138_166_255/0.16)] group-hover:-translate-y-2 group-hover:opacity-100">{service.num}</span>
      <Link href={href} className="relative flex h-full flex-col rounded-[calc(var(--radius-card)-4px)] p-6 sm:p-7">
        <div className="flex items-start justify-between">
          <span className="relative">
            <span aria-hidden="true" className="svx-card-halo" />
            <span className="fx-icon relative grid size-12 place-items-center rounded-xl border border-line-strong bg-gradient-to-br from-brand/20 to-accent/10 text-brand-soft">
              <Icon name={service.icon} size={22} />
            </span>
          </span>
          <span className="font-mono text-xs text-subtle">{service.num}</span>
        </div>
        <div className="mt-8 flex flex-1 flex-col gap-x-12 @xl:grid @xl:grid-cols-2 @xl:content-start">
          <div className="flex flex-1 flex-col">
            <h3 className="text-xl font-semibold text-text @xl:text-2xl @xl:tracking-tight">{service.name}</h3>
            <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-muted">{service.line}</p>
          </div>
          {list.length > 0 && (
            <ul className="mt-5 space-y-2 text-sm text-muted @xl:mt-1">
              {list.map((f, j) => (
                <li key={f} className="svx-card-feat flex gap-2" style={{ '--j': j } as React.CSSProperties}>
                  <Check aria-hidden="true" size={14} strokeWidth={2.2} className="mt-[3px] shrink-0 text-brand-soft" />{f}
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5 text-sm font-medium text-brand-soft transition-colors group-hover:text-text">
          Explore service <span aria-hidden="true" className="svx-card-go"><ArrowUpRight size={16} /></span>
        </span>
      </Link>
    </SpotlightCard>
  );
}
