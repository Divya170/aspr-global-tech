'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import '@/components/pages/forms/forms.css';

/** Copies a short value (e.g. an inquiry ID) and confirms in place and to screen readers. Glass pill; the tick pops in. */
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
        className={`fx-shine group inline-flex min-h-11 items-center gap-2.5 rounded-full border py-1 pl-1.5 pr-4 text-sm font-medium text-text backdrop-blur transition-[border-color,background-color,box-shadow,transform] duration-300 active:scale-[0.97] ${done ? 'border-success/50 bg-success/10 shadow-[0_10px_30px_-14px_rgb(52_211_153/0.8)]' : 'border-line-strong bg-white/[0.04] hover:border-brand-soft/50 hover:bg-white/[0.07] hover:shadow-[0_12px_30px_-16px_rgb(65_112_255/0.9)]'}`}>
        <span aria-hidden="true" className={`grid size-8 place-items-center rounded-full transition-colors duration-300 ${done ? 'bg-success/20 text-success' : 'bg-white/[0.06] text-brand-soft group-hover:bg-brand-strong group-hover:text-white'}`}>
          {done ? <Check size={15} strokeWidth={2.6} className="fm-pop" /> : <Copy size={15} />}
        </span>
        {done ? 'Copied' : label}
      </button>
      <span role="status" className="sr-only">{done ? `${value} copied to the clipboard.` : failed ? 'Copying is blocked in this browser. Select the ID and copy it instead.' : ''}</span>
    </>
  );
}
