import { ServiceCard } from '@/components/sections/ServiceCard';
import { Reveal } from '@/components/ui/Reveal';
import type { ServiceCard as Service } from '@/lib/types';

const LG_SPAN = ['lg:col-span-1', 'lg:col-span-2', 'lg:col-span-3', 'lg:col-span-4'];

/**
 * All services as a bento grid: the first service is a large featured tile (2×2 on desktop) and
 * the last tile widens to close the final row, so the grid always ends flush for any count.
 */
export function ServiceBento({ services, features }: { services: Service[]; features: Map<string, string[]> }) {
  if (services.length < 3) {
    return <div className="grid gap-4 sm:grid-cols-2">{services.map((svc) => <Reveal key={svc.slug}><ServiceCard service={svc} features={features.get(svc.slug)} /></Reveal>)}</div>;
  }
  const rest = services.length - 1;
  const lgExtra = (4 - ((rest + 4) % 4)) % 4; // empty cells left in the last row of 4
  const smWide = rest % 2 === 1; // the featured tile fills a whole row of 2
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {services.map((svc, i) => {
        const span = i === 0 ? 'sm:col-span-2 lg:row-span-2'
          : i === rest ? `${smWide ? 'sm:col-span-2' : ''} ${LG_SPAN[lgExtra]}` : '';
        return (
          <Reveal key={svc.slug} delay={i === 0 ? 0 : ((i + 1) % 4) * 70} className={span}>
            <ServiceCard service={svc} features={features.get(svc.slug)} featured={i === 0} />
          </Reveal>
        );
      })}
    </div>
  );
}
