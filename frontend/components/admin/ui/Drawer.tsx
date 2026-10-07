'use client';

import { X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';
import { Portal, useOverlay } from './Modal';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'left';
  width?: string;
}

/** Side panel dialog (detail views, mobile navigation). Same focus/escape behaviour as Modal. */
export function Drawer({ open, onClose, title, subtitle, children, footer, side = 'right', width = 'max-w-xl' }: DrawerProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(open, panel, onClose);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-[#02040a]/70 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`absolute inset-y-0 ${side === 'right' ? 'right-0 border-l' : 'left-0 border-r'} flex w-full ${width} flex-col border-line-strong bg-surface shadow-2xl shadow-black/60 outline-none`}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate text-base font-semibold text-text">{title}</h2>
              {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1"><X size={18} aria-hidden="true" /></IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap items-center gap-2 border-t border-line bg-bg-2/60 px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
