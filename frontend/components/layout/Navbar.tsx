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
  const linksRef = useRef<HTMLUListElement>(null);
  // Hover pill that glides between desktop links; it fades in on first hover instead of sliding from the left.
  const [hover, setHover] = useState({ x: 0, w: 0, on: false, glide: false });
  const onHover = (e: React.MouseEvent<HTMLElement>) => {
    const a = e.currentTarget.getBoundingClientRect(), b = linksRef.current!.getBoundingClientRect();
    setHover((h) => ({ x: a.left - b.left, w: a.width, on: true, glide: h.on }));
  };

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
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Bar background, as on main: pale page colour with a blur and a hairline border; a soft shadow
          once the page scrolls. A sibling layer rather than classes on <header>: a backdrop-filter on
          the header would become the containing block of the fixed mobile menu and collapse it to zero height. */}
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 border-b border-line backdrop-blur-[10px] transition-shadow duration-500 ${open ? 'bg-surface' : 'bg-bg/92'} ${scrolled ? 'shadow-[0_10px_30px_-24px_color-mix(in_srgb,var(--color-navy)_45%,transparent)]' : ''}`} />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-brand-strong focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      {/* Main's header row: logo, bold links, brand CTA, aligned with the page container. */}
      <nav aria-label="Main" className="relative isolate mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />

        <ul ref={linksRef} className="relative isolate hidden items-center gap-1.5 lg:flex" onMouseLeave={() => setHover((h) => ({ ...h, on: false, glide: false }))}>
          <span aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 -z-10 rounded-xl bg-surface-3 duration-300 ease-[var(--ease-out-expo)] ${hover.glide ? 'transition-[transform,width,opacity]' : 'transition-opacity'}`}
            style={{ width: hover.w, transform: `translateX(${hover.x}px)`, opacity: hover.on ? 1 : 0 }} />
          {NAV.map((item) => item.href === '/services' ? (
            <li key={item.href} ref={megaRef} className="relative" onMouseEnter={(e) => { onHover(e); if (matchMedia('(pointer: fine)').matches) setMega(true); }} onMouseLeave={() => setMega(false)}>
              <button
                type="button" aria-expanded={mega} aria-controls="mega-services" onClick={() => setMega((m) => !m)}
                className={`flex items-center gap-1 rounded-xl px-4 py-2.5 text-[1.0625rem] font-bold transition-colors ${active(item.href) || mega ? 'text-brand' : 'text-text hover:text-brand'} ${active(item.href) ? 'bg-surface-3' : ''}`}
              >
                {item.label}<ChevronDown aria-hidden="true" size={15} className={`transition-transform ${mega ? 'rotate-180' : ''}`} />
              </button>
              <div id="mega-services" className={`absolute left-1/2 top-full w-[min(760px,calc(100vw-3rem))] -translate-x-1/2 pt-3 transition-all duration-300 ${mega ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'}`}>
                <div className="panel relative grid grid-cols-2 gap-1 overflow-hidden p-3 shadow-[0_28px_60px_-24px_color-mix(in_srgb,var(--color-navy)_35%,transparent)]">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-brand)_13%,transparent),transparent)]" />
                  {services.map((s, i) => (
                    <Link key={s.slug} href={`/services/${s.slug}`} style={{ transitionDelay: mega ? `0ms, ${i * 35}ms, ${i * 35}ms` : '0ms' }}
                      className={`group relative flex gap-3 rounded-xl p-3 transition-[background-color,opacity,translate] duration-500 ease-[var(--ease-out-expo)] hover:bg-surface-3 ${mega ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'}`}>
                      <span className="fx-icon grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface text-brand">
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
            <li key={item.href} onMouseEnter={onHover}>
              <Link href={item.href} aria-current={active(item.href) ? 'page' : undefined}
                className={`relative block rounded-xl px-4 py-2.5 text-[1.0625rem] font-bold transition-colors ${active(item.href) ? 'bg-surface-3 text-brand' : 'text-text hover:text-brand'}`}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          <Magnetic>
            <Link href="/quote" onClick={() => track('CTA Click', { location: 'navbar' })}
              className="group/cta flex items-center gap-2 whitespace-nowrap rounded-[14px] bg-brand px-3.5 py-3 text-sm font-extrabold text-white shadow-[0_10px_24px_color-mix(in_srgb,var(--color-brand)_28%,transparent)] transition-colors hover:bg-brand-strong hover:text-white min-[481px]:px-6 min-[481px]:py-3.5 min-[481px]:text-[1.0625rem]">
              Start a Project<span aria-hidden="true" className="hidden transition-transform group-hover/cta:translate-x-0.5 min-[481px]:inline">→</span>
            </Link>
          </Magnetic>
          <button
            ref={toggleRef} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid size-[46px] place-items-center rounded-xl border border-line bg-surface text-text transition-colors hover:bg-surface-3 lg:hidden"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label="Menu" hidden={!open}
        className="fixed inset-x-0 bottom-0 top-18 overflow-y-auto border-t border-line bg-surface lg:hidden"
      >
        <div className="flex min-h-full flex-col px-4 pb-10 pt-6 sm:px-6">
          <ul className="flex flex-col">
            {[{ label: 'Home', href: '/' }, ...NAV].map((item, i) => (
              <li key={item.href} className="animate-fade-up border-b border-line" style={{ animationDelay: `${i * 45}ms` }}>
                <Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined}
                  className={`flex items-center justify-between px-1 py-4 text-lg font-bold ${pathname === item.href ? 'text-brand' : 'text-text'}`}>
                  {item.label}<span aria-hidden="true" className="text-brand">+</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid grid-cols-2 gap-2">
            {services.slice(0, 6).map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-3 text-sm text-muted">
                <Icon name={s.icon} size={16} className="shrink-0 text-brand" /><span className="truncate">{s.name}</span>
              </Link>
            ))}
          </div>
          <ButtonLink href="/quote" size="lg" arrow className="mt-8 w-full" onClick={() => track('CTA Click', { location: 'mobile-menu' })}>Start a Project</ButtonLink>
        </div>
      </div>
    </header>
  );
}
