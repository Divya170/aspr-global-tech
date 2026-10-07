'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { buttonClass } from '@/components/ui/Button';

/** Primary submit with a busy state. Stays focusable while sending so focus is not lost. */
export function SubmitButton({ busy, children, busyLabel = 'Sending…', className = '' }: { busy: boolean; children: ReactNode; busyLabel?: string; className?: string }) {
  return (
    <>
    <button
      type="submit" aria-disabled={busy || undefined}
      onClick={(e) => { if (busy) e.preventDefault(); }}
      className={buttonClass({ size: 'lg', className: `${busy ? 'cursor-progress opacity-80' : ''} ${className}` })}
    >
      {busy ? (
        <><Loader2 aria-hidden="true" size={18} className="motion-safe:animate-spin" />{busyLabel}</>
      ) : (
        <>{children}<ArrowRight aria-hidden="true" size={17} className="transition-transform duration-300 group-hover/btn:translate-x-0.5" /></>
      )}
    </button>
    <span role="status" className="sr-only">{busy ? busyLabel : ''}</span>
    </>
  );
}
