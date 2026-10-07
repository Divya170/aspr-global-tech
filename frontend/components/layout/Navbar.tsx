'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Magnetic } from '@/components/ui/Magnetic';
import { track } from '@/lib/analytics';
import { NAV } from '@/lib/site';
import type { ServiceCard } from '@/lib/types';
import { Logo } from './Logo';

export function Navbar({ services }: { services: ServiceCard[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  const megaRef = useRef<HTMLLIElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on navigation.
  useEffect(() => { setOpen(false); setMega(false); }, [pathname]);

  // Mobile menu: lock scroll, close on Escape, keep focus inside.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = menuRef.current?.querySelector<HTMLElement>('a, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
      if (e.key === 'Tab' && menuRef.current) {
        const items = [...menuRef.current.querySelectorAll<HTMLElement>('a, button')];
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open]);

  // Mega menu: close on outside click or Escape.
  useEffect(() => {
    if (!mega) return;
    const onDown = (e: PointerEvent) => { if (!megaRef.current?.contains(e.target as Node)) setMega(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMega(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [mega]);

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-500 ${scrolled || open ? 'border-b border-line bg-bg/75 backdrop-blur-xl' : 'border-b border-transparent'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-brand-strong focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <nav aria-label="Main" className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => item.href === '/services' ? (
            <li key={item.href} ref={megaRef} className="relative" onMouseEnter={() => matchMedia('(pointer: fine)').matches && setMega(true)} onMouseLeave={() => setMega(false)}>
              <button
                type="button" aria-expanded={mega} aria-controls="mega-services" onClick={() => setMega((m) => !m)}
                className={`flex items-center gap-1 rounded-full px-4 py-2 text-[0.95rem] transition-colors ${active(item.href) ? 'text-text' : 'text-muted hover:text-text'}`}
              >
                {item.label}<ChevronDown aria-hidden="true" size={15} className={`transition-transform ${mega ? 'rotate-180' : ''}`} />
              </button>
              <div id="mega-services" className={`absolute left-1/2 top-full w-[min(760px,calc(100vw-3rem))] -translate-x-1/2 pt-3 transition-all duration-300 ${mega ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'}`}>
                <div className="panel grid grid-cols-2 gap-1 bg-surface/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
                  {services.map((s) => (
                    <Link key={s.slug} href={`/services/${s.slug}`} className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.04]">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.03] text-brand-soft transition-colors group-hover:border-brand/40 group-hover:text-text">
                        <Icon name={s.icon} size={19} />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-text">{s.name}</span>
                        <span className="mt-0.5 line-clamp-2 block text-[0.8rem] leading-snug text-subtle">{s.line}</span>
                      </span>
                    </Link>
                  ))}
                  <Link href="/services" className="col-span-2 mt-1 rounded-xl border border-line px-4 py-3 text-center text-sm text-muted transition-colors hover:border-brand/40 hover:text-text">
                    All services and how we work →
                  </Link>
                </div>
              </div>
            </li>
          ) : (
            <li key={item.href}>
              <Link href={item.href} aria-current={active(item.href) ? 'page' : undefined}
                className={`rounded-full px-4 py-2 text-[0.95rem] transition-colors ${active(item.href) ? 'text-text' : 'text-muted hover:text-text'}`}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <Magnetic>
              <ButtonLink href="/quote" size="sm" arrow onClick={() => track('CTA Click', { location: 'navbar' })}>Start a Project</ButtonLink>
            </Magnetic>
          </span>
          <button
            ref={toggleRef} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid size-11 place-items-center rounded-full border border-line-strong text-text transition-colors hover:bg-white/5 lg:hidden"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label="Menu" hidden={!open}
        className="fixed inset-x-0 bottom-0 top-18 overflow-y-auto bg-bg/98 backdrop-blur-xl lg:hidden"
      >
        <div className="flex min-h-full flex-col px-4 pb-10 pt-6 sm:px-6">
          <ul className="flex flex-col">
            {[{ label: 'Home', href: '/' }, ...NAV].map((item, i) => (
              <li key={item.href} className="animate-fade-up border-b border-line" style={{ animationDelay: `${i * 45}ms` }}>
                <Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined}
                  className="flex items-center justify-between py-4 font-display text-3xl font-medium tracking-tight text-text">
                  {item.label}<span aria-hidden="true" className="font-mono text-xs text-subtle">0{i + 1}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid grid-cols-2 gap-2">
            {services.slice(0, 6).map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-3 text-sm text-muted">
                <Icon name={s.icon} size={16} className="shrink-0 text-brand-soft" /><span className="truncate">{s.name}</span>
              </Link>
            ))}
          </div>
          <ButtonLink href="/quote" size="lg" arrow className="mt-8 w-full" onClick={() => track('CTA Click', { location: 'mobile-menu' })}>Start a Project</ButtonLink>
        </div>
      </div>
    </header>
  );
}
