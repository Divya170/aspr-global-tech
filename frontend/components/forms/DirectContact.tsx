import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import type { Company } from '@/lib/types';
import '@/components/pages/forms/forms.css';

/**
 * Email / phone / WhatsApp (and optionally address and hours) as tappable glass cards: the icon
 * fills and an arrow slides in on hover/focus (.fm-dc in forms.css). Server component.
 */
export function DirectContact({ company: c, full = false, className = '' }: { company: Company; full?: boolean; className?: string }) {
  const rows: { icon: LucideIcon; label: string; value: string; href?: string; external?: boolean }[] = [
    c.email && { icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
    c.phone && { icon: Phone, label: 'Phone', value: c.phone, href: c.phoneHref || `tel:${c.phone.replace(/[^\d+]/g, '')}` },
    c.whatsappUrl && { icon: MessageCircle, label: 'WhatsApp', value: 'Message us on WhatsApp', href: c.whatsappUrl, external: true },
    full && c.address && { icon: MapPin, label: 'Studio', value: c.address },
    full && c.hours && { icon: Clock, label: 'Hours', value: c.hours },
  ].filter(Boolean) as never;

  return (
    <ul className={`space-y-2.5 ${className}`}>
      {rows.map(({ icon: I, label, value, href, external }) => {
        const body = (
          <>
            <span aria-hidden="true" className="fx-icon grid size-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-white/[0.04] text-brand-soft">
              <I size={18} strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-subtle">{label}</span>
              <span className={`mt-0.5 block break-words text-sm ${href ? 'text-text group-hover:text-brand-soft' : 'leading-relaxed text-muted'} transition-colors`}>{value}</span>
            </span>
          </>
        );
        return (
          <li key={label}>
            {href ? (
              <a href={href} {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
                className="fm-dc group flex min-h-16 items-center gap-3.5 rounded-2xl py-3 pl-3 pr-4">
                {body}{external && <span className="sr-only"> (opens in a new tab)</span>}
                <ArrowUpRight aria-hidden="true" size={17} className="fm-dc-arrow shrink-0 text-brand-soft" />
              </a>
            ) : (
              <div className="fm-dc flex items-start gap-3.5 rounded-2xl py-3 pl-3 pr-4">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
