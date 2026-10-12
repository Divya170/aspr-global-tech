import type { ReactNode } from 'react';

/** Page title row with optional description and actions. */
export function PageHeader({ title, description, actions, eyebrow, children }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs text-subtle">{eyebrow}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Bordered surface for admin content. */
export function Card({ children, className = '', as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'aside'; 'aria-labelledby'?: string; 'aria-label'?: string }) {
  return <As className={`rounded-xl border border-line bg-surface/70 ${className}`} {...rest}>{children}</As>;
}

export function CardHeader({ title, id, actions, description }: { title: ReactNode; id?: string; actions?: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-text">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Horizontal row of filter controls that wraps on small screens. */
export function FilterBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-end gap-2 border-b border-line p-3 ${className}`}>{children}</div>;
}

/** Term/value list for detail views. */
export function DefinitionList({ items }: { items: { term: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.term} className="min-w-0">
          <dt className="text-xs text-subtle">{i.term}</dt>
          <dd className="mt-0.5 break-words text-sm text-text">{i.value || <span className="text-subtle">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
