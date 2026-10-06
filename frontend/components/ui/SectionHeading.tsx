import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

/** Eyebrow + heading + optional lead. `id` lets the parent <Section> reference it with aria-labelledby. */
export function SectionHeading({ eyebrow, title, lead, id, align = 'left', as: As = 'h2', className = '', action }: {
  eyebrow?: string; title: ReactNode; lead?: ReactNode; id?: string; align?: 'left' | 'center'; as?: 'h1' | 'h2'; className?: string; action?: ReactNode;
}) {
  const center = align === 'center';
  return (
    <Reveal className={`flex flex-col gap-6 ${center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'} ${className}`}>
      <div className={center ? 'max-w-3xl' : 'max-w-3xl'}>
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <As id={id} className={As === 'h1' ? 'text-display' : 'text-heading sm:text-display'}>{title}</As>
        {lead && <p className={`text-lead mt-5 ${center ? 'mx-auto' : ''} max-w-2xl`}>{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}
