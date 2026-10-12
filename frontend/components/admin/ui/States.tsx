import { AlertTriangle, Inbox, Lock, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { ApiError } from '@/lib/client';
import { AButton } from './Button';

export function EmptyState({ title, children, icon, action, className = '' }: { title: string; children?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-subtle">{icon ?? <Inbox size={20} aria-hidden="true" />}</div>
      <p className="font-medium text-text">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Error panel with retry. A 403 renders the "no access" state instead. */
export function ErrorState({ error, onRetry, className = '' }: { error: unknown; onRetry?: () => void; className?: string }) {
  if (error instanceof ApiError && error.status === 403 && !/session token/i.test(error.message)) return <NoAccess className={className} />;
  const message = error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div role="alert" className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 text-danger"><AlertTriangle size={20} aria-hidden="true" /></div>
      <p className="font-medium text-text">Couldn&apos;t load this</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && <AButton className="mt-4" size="sm" onClick={onRetry} icon={<RotateCw size={14} aria-hidden="true" />}>Try again</AButton>}
    </div>
  );
}

export function NoAccess({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-warning/30 bg-warning/10 text-warning"><Lock size={20} aria-hidden="true" /></div>
      <p className="font-medium text-text">You don&apos;t have access</p>
      <p className="mt-1 max-w-sm text-sm text-muted">Your role doesn&apos;t include this area. Ask an admin if you need it.</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface-3 ${className}`} />;
}

/** Placeholder rows for tables and lists. */
export function SkeletonRows({ rows = 6, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 p-4 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-28 sm:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Small "Loading…" text for inline areas. */
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand-soft" />
      {label}
    </span>
  );
}
