'use client';

// Header for standalone pages (/services…). Mirrors the home page header.

import { SHOW_WORK } from '@/lib/flags';
import { useState } from 'react';

const NAV = [
  ['Services', '/services'], ['Products', '/#products'], ...(SHOW_WORK ? [['Work', '/company#work']] : []), ['About', '/company#about'], ['Company', '/company#process'],
];

export default function SiteHeader({ active = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sh">
      <div className="sh-inner">
        <a href="/" aria-label="ASPR Global Tech home" style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
          <img src="/assets/aspr-logo.png" alt="ASPR Global Tech" style={{ height: '48px', width: 'auto' }} />
        </a>
        <nav aria-label="Main" className="sh-nav">
          {NAV.map(([label, href]) => (
            <a key={label} href={href} className={`sh-link${active === label ? ' is-on' : ''}`} aria-current={active === label ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a href="/#start" className="sh-cta">Start a project <span>→</span></a>
          <button type="button" className="sh-menu" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? '✕' : '☰'}</button>
        </div>
      </div>
      {open ? (
        <div className="sh-drawer">
          {NAV.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>{label}<span>+</span></a>
          ))}
        </div>
      ) : null}
    </header>
  );
}
