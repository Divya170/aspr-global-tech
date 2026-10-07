'use client';

import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; message: string }
interface ToastApi { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void }

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used inside <ToastProvider>');
  return c;
}

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const STYLES: Record<Kind, string> = {
  success: 'border-success/30 [&_svg.k]:text-success',
  error: 'border-danger/40 [&_svg.k]:text-danger',
  info: 'border-brand/35 [&_svg.k]:text-brand-soft',
};

/** Transient messages. Errors are announced assertively and stay longer. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((kind: Kind, message: string) => {
    const id = next.current++;
    setItems((xs) => [...xs.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4000);
  }, [dismiss]);
  const api = useMemo<ToastApi>(() => ({
    success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m),
  }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end">
        <div role="status" aria-live="polite" className="contents">
          {items.filter((t) => t.kind !== 'error').map((t) => <ToastView key={t.id} t={t} onClose={() => dismiss(t.id)} />)}
        </div>
        <div role="alert" aria-live="assertive" className="contents">
          {items.filter((t) => t.kind === 'error').map((t) => <ToastView key={t.id} t={t} onClose={() => dismiss(t.id)} />)}
        </div>
      </div>
    </Ctx.Provider>
  );
}

function ToastView({ t, onClose }: { t: ToastItem; onClose: () => void }) {
  const I = ICONS[t.kind];
  return (
    <div className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface-2 px-4 py-3 text-sm text-text shadow-xl shadow-black/50 animate-page-in ${STYLES[t.kind]}`}>
      <I aria-hidden="true" size={18} className="k mt-px shrink-0" />
      <p className="min-w-0 flex-1">{t.message}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="-mr-1 rounded text-subtle hover:text-text"><X size={16} aria-hidden="true" /></button>
    </div>
  );
}
