'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Copies a short value (e.g. an inquiry ID) and confirms in place and to screen readers. */
export function CopyButton({ value, label = 'Copy inquiry ID' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (!done) return; const t = setTimeout(() => setDone(false), 2200); return () => clearTimeout(t); }, [done]);

  async function copy() {
    try { await navigator.clipboard.writeText(value); setDone(true); setFailed(false); }
    catch { setFailed(true); }
  }

  return (
    <>
      <button type="button" onClick={copy}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] px-4 text-sm font-medium text-text transition-colors hover:border-brand-soft/50 hover:bg-white/[0.06]">
        {done ? <Check aria-hidden="true" size={16} className="text-success" /> : <Copy aria-hidden="true" size={16} />}
        {done ? 'Copied' : label}
      </button>
      <span role="status" className="sr-only">{done ? `${value} copied to the clipboard.` : failed ? 'Copying is blocked in this browser. Select the ID and copy it instead.' : ''}</span>
    </>
  );
}
