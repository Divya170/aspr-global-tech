import { Plus } from 'lucide-react';

/**
 * FAQ accordion built on <details>/<summary>: keyboard and screen-reader accessible and
 * works without JavaScript.
 */
export function Accordion({ items, className = '' }: { items: { q: string; a: string; id?: string }[]; className?: string }) {
  return (
    <div className={`divide-y divide-line border-y border-line ${className}`}>
      {items.map((it, i) => (
        <details key={it.id || i} id={it.id} className="group py-1 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-lg py-5 text-left text-lg font-medium text-text transition-colors hover:text-brand-soft">
            <span>{it.q}</span>
            <Plus aria-hidden="true" size={20} className="mt-1 shrink-0 text-subtle transition-transform duration-300 group-open:rotate-45 group-open:text-brand-soft" />
          </summary>
          <p className="max-w-3xl pb-6 leading-relaxed text-muted">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
