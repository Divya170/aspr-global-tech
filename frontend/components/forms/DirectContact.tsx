import { Clock, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import type { Company } from '@/lib/types';

/** Email / phone / WhatsApp (and optionally address and hours) as tappable rows. Server component. */
export function DirectContact({ company: c, full = false, className = '' }: { company: Company; full?: boolean; className?: string }) {
  const rows: { icon: LucideIcon; label: string; value: string; href?: string; external?: boolean }[] = [
    c.email && { icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
    c.phone && { icon: Phone, label: 'Phone', value: c.phone, href: c.phoneHref || `tel:${c.phone.replace(/[^\d+]/g, '')}` },
    c.whatsappUrl && { icon: MessageCircle, label: 'WhatsApp', value: 'Message us on WhatsApp', href: c.whatsappUrl, external: true },
    full && c.address && { icon: MapPin, label: 'Studio', value: c.address },
    full && c.hours && { icon: Clock, label: 'Hours', value: c.hours },
  ].filter(Boolean) as never;

  return (
    <ul className={`space-y-2 ${className}`}>
      {rows.map(({ icon: I, label, value, href, external }) => {
        const body = (
          <>
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg border border-line-strong bg-white/[0.03] text-brand-soft transition-colors group-hover:border-brand-soft/50">
              <I size={18} strokeWidth={1.7} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-subtle">{label}</span>
              <span className={`block break-words text-sm ${href ? 'text-text group-hover:text-brand-soft' : 'text-muted'} transition-colors`}>{value}</span>
            </span>
          </>
        );
        return (
          <li key={label}>
            {href ? (
              <a href={href} {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
                className="group -mx-2 flex min-h-14 items-center gap-3.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
                {body}{external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            ) : (
              <div className="flex items-start gap-3.5 py-1.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
