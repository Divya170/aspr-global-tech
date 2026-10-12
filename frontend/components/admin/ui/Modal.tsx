'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AButton, IconButton } from './Button';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open overlays, innermost last; only the top one reacts to Escape and Tab. */
const stack: symbol[] = [];

/**
 * Focus trap for dialogs and drawers: moves focus inside on open, keeps Tab within the panel,
 * closes on Escape, restores focus to the opener on close and locks page scroll.
 */
export function useOverlay(open: boolean, panel: RefObject<HTMLElement | null>, onClose: () => void, initialFocus?: RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const me = Symbol('overlay');
    stack.push(me);
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const el = initialFocus?.current || panel.current?.querySelector<HTMLElement>('[data-autofocus]') || panel.current?.querySelector<HTMLElement>(FOCUSABLE) || panel.current;
      el?.focus();
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== me) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
      if (!items.length) { e.preventDefault(); panel.current.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
      if (!stack.length) document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  initialFocus?: RefObject<HTMLElement | null>;
  role?: 'dialog' | 'alertdialog';
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', initialFocus, role = 'dialog' }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useOverlay(open, panel, onClose, initialFocus);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-6xl' }[size];
  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
        <div className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
        <div
          ref={panel}
          role={role}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={`relative flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-t-2xl border border-line-strong bg-surface shadow-2xl shadow-navy/20 outline-none sm:rounded-2xl`}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold text-text">{title}</h2>
              {description && <p id={descId} className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1"><X size={18} aria-hidden="true" /></IconButton>
          </div>
          {children !== undefined && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-bg-2/60 px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Yes/no confirmation. Focus starts on Cancel so Enter never deletes by accident. */
export function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', tone = 'danger', busy, onConfirm, onCancel }: ConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      title={title}
      description={description}
      size="sm"
      role="alertdialog"
      initialFocus={cancelRef}
      footer={
        <>
          <AButton ref={cancelRef} onClick={onCancel} disabled={busy}>Cancel</AButton>
          <AButton variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>{confirmLabel}</AButton>
        </>
      }
    />
  );
}
