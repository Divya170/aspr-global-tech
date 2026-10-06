import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import type { ServiceCard as Service } from '@/lib/types';

export function ServiceCard({ service, features }: { service: Service; features?: string[] }) {
  return (
    <SpotlightCard tilt className="panel group h-full p-1">
      <Link href={`/services/${service.slug}`} className="flex h-full flex-col rounded-[calc(var(--radius-card)-4px)] p-6 sm:p-7">
        <div className="flex items-start justify-between">
          <span className="grid size-12 place-items-center rounded-xl border border-line-strong bg-gradient-to-br from-brand/20 to-accent/10 text-brand-soft transition-colors duration-500 group-hover:text-text">
            <Icon name={service.icon} size={22} />
          </span>
          <span className="font-mono text-xs text-subtle">{service.num}</span>
        </div>
        <h3 className="mt-8 text-xl font-semibold text-text">{service.name}</h3>
        <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-muted">{service.line}</p>
        {features && features.length > 0 && (
          <ul className="mt-5 space-y-2 text-sm text-muted">
            {features.slice(0, 3).map((f) => <li key={f} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-brand-soft" />{f}</li>)}
          </ul>
        )}
        <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-brand-soft transition-colors group-hover:text-text">
          Explore service <ArrowUpRight aria-hidden="true" size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </Link>
    </SpotlightCard>
  );
}
