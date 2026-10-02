'use client';
import { useEffect, useRef, useState } from 'react';

export const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return isNaN(d) ? s : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
export const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
export const label = (s) => String(s || '').replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function Pill({ value }) {
  return <span className={'ad-pill ' + String(value)}>{label(value)}</span>;
}

export function Empty({ title, body, action }) {
  return <div className="ad-empty"><b>{title}</b>{body}{action ? <div style={{ marginTop: 14 }}>{action}</div> : null}</div>;
}

export function Loading({ text = 'Loading…' }) {
  return <div className="ad-loading" role="status">{text}</div>;
}

export function ErrorBox({ error, retry }) {
  if (!error) return null;
  return (
    <div className="ad-alert" role="alert"><b>Something went wrong.</b> {error.message || String(error)}
      {retry ? <> <button type="button" className="ad-mini" onClick={retry} style={{ marginLeft: 8 }}>Retry</button></> : null}
    </div>
  );
}

export function Pager({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="ad-pager">
      <span>{total} result{total === 1 ? '' : 's'} · page {page} of {pages}</span>
      <span style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="ad-btn ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
        <button type="button" className="ad-btn ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
      </span>
    </div>
  );
}

export function Drawer({ title, eyebrow, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k); ref.current && ref.current.focus();
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      <div className="ad-drawer-bg" onClick={onClose} aria-hidden="true" />
      <aside className="ad-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ad-drawer-head">
          <div>{eyebrow ? <p className="ad-eyebrow">{eyebrow}</p> : null}<h1 style={{ fontSize: 24 }}>{title}</h1></div>
          <button ref={ref} type="button" className="ad-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </aside>
    </>
  );
}

/** Debounced value for search boxes. */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
