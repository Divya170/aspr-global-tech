import { Plus } from 'lucide-react';

/**
 * FAQ accordion built on <details>/<summary>: keyboard and screen-reader accessible and works
 * without JavaScript. Each question is a card that glows when open; the height animates in
 * browsers that support animating <details> content.
 */
export function Accordion({ items, className = '' }: { items: { q: string; a: string; id?: string }[]; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {items.map((it, i) => (
        <details key={it.id || i} id={it.id} className="fx-acc group [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-start gap-4 rounded-[1.1rem] px-5 py-5 text-left sm:gap-6 sm:px-6">
            <span aria-hidden="true" className="fx-acc-num mt-0.5 hidden font-display text-lg font-semibold sm:block">{String(i + 1).padStart(2, '0')}</span>
            <span className="flex-1 text-[1.05rem] font-medium text-text transition-colors group-hover:text-brand sm:text-lg">{it.q}</span>
            <span aria-hidden="true" className="fx-acc-icon grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-subtle"><Plus size={16} /></span>
          </summary>
          <p className="max-w-3xl px-5 pb-6 leading-relaxed text-muted sm:pl-[4.25rem] sm:pr-16">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
