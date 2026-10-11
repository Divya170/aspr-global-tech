'use client';

import {
  Briefcase, ChevronDown, ExternalLink, FileText, History, Image as ImageIcon, Inbox, LayoutDashboard, LogOut, Mail, Menu,
  MessagesSquare, Settings, UserCircle2, Users, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { CONTENT_NAV, ROLE_INFO } from '@/lib/admin/constants';
import { initials } from '@/lib/admin/format';
import type { Permission } from '@/lib/admin/types';
import { NotificationBell } from './NotificationBell';
import { useSession } from './SessionProvider';
import { Drawer } from './ui/Drawer';
import { usePopover } from './usePopover';

interface NavItem { href: string; label: string; icon: LucideIcon; perm?: Permission; exact?: boolean }

const MAIN: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard', exact: true },
  { href: '/admin/leads', label: 'Leads', icon: Inbox, perm: 'leads' },
  { href: '/admin/applications', label: 'Applications', icon: Briefcase, perm: 'applications' },
  { href: '/admin/subscribers', label: 'Subscribers', icon: Mail, perm: 'subscribers' },
  { href: '/admin/chat', label: 'Chat', icon: MessagesSquare, perm: 'chat' },
];
const AFTER: NavItem[] = [
  { href: '/admin/media', label: 'Media', icon: ImageIcon, perm: 'media' },
  { href: '/admin/users', label: 'Team', icon: Users, perm: 'users' },
  { href: '/admin/activity', label: 'Activity', icon: History, perm: 'activity' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings' },
  { href: '/admin/account', label: 'Account', icon: UserCircle2 },
];

const isActive = (pathname: string, item: { href: string; exact?: boolean }) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, item);
  const I = item.icon;
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${active ? 'bg-brand/15 text-text' : 'text-muted hover:bg-surface-3 hover:text-text'}`}>
      <I size={17} aria-hidden="true" className={active ? 'text-brand' : 'text-subtle group-hover:text-muted'} />
      {item.label}
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useSession();
  const onContent = pathname.startsWith('/admin/content');
  const [contentOpen, setContentOpen] = useState(onContent);
  useEffect(() => { if (onContent) setContentOpen(true); }, [onContent]);
  const allowed = (i: NavItem) => !i.perm || can(i.perm);
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 px-3 py-3">
      {MAIN.filter(allowed).map((i) => <NavLink key={i.href} item={i} pathname={pathname} onNavigate={onNavigate} />)}
      {can('content') && (
        <div className="mt-0.5">
          <button type="button" aria-expanded={contentOpen} aria-controls="nav-content" onClick={() => setContentOpen(!contentOpen)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${onContent ? 'text-text' : 'text-muted hover:bg-surface-3 hover:text-text'}`}>
            <FileText size={17} aria-hidden="true" className={onContent ? 'text-brand' : 'text-subtle'} />
            <span className="flex-1 text-left">Content</span>
            <ChevronDown size={15} aria-hidden="true" className={`text-subtle transition-transform ${contentOpen ? 'rotate-180' : ''}`} />
          </button>
          <ul id="nav-content" hidden={!contentOpen} className="mb-1 ml-[1.15rem] mt-0.5 border-l border-line pl-2">
            {CONTENT_NAV.map((c) => {
              const href = `/admin/content/${c.name}`;
              const active = isActive(pathname, { href });
              return (
                <li key={c.name}>
                  <Link href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
                    className={`block rounded-md px-2.5 py-1 text-[0.8125rem] transition-colors ${active ? 'bg-brand/15 text-text' : 'text-muted hover:bg-surface-3 hover:text-text'}`}>
                    {c.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {AFTER.filter(allowed).map((i) => <NavLink key={i.href} item={i} pathname={pathname} onNavigate={onNavigate} />)}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 rounded-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/aspr-logo.png" alt="ASPR Global Tech" width={96} height={44} className="h-7 w-auto" />
      <span className="rounded border border-line-strong px-1.5 py-px font-mono text-[0.625rem] uppercase tracking-[0.14em] text-subtle">Admin</span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useSession();
  const { open, setOpen, ref, buttonRef } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button ref={buttonRef} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" aria-label={`Account menu for ${user.name}`}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-surface-3">
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-strong text-[0.7rem] font-semibold text-white">{initials(user.name)}</span>
        <span className="hidden max-w-36 truncate text-sm text-text sm:block">{user.name}</span>
        <ChevronDown size={14} aria-hidden="true" className="hidden text-subtle sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-2xl shadow-navy/20">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-text">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-1 text-xs text-brand">{ROLE_INFO[user.role]?.label ?? user.role}</p>
          </div>
          <div className="p-1.5">
            <Link href="/admin/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-surface-3 hover:text-text">
              <UserCircle2 size={16} aria-hidden="true" /> Account &amp; password
            </Link>
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-surface-3 hover:text-text">
              <ExternalLink size={16} aria-hidden="true" /> View website
            </a>
            <button type="button" onClick={() => { setOpen(false); void logout(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-danger/10 hover:text-danger">
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Authenticated admin frame: sidebar (drawer on mobile), top bar, main content. */
export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  return (
    <div className="min-h-dvh bg-bg">
      <a href="#admin-main" className="sr-only z-[200] rounded-lg bg-brand px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-bg-2 lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-line px-5"><Brand /></div>
        <div className="min-h-0 flex-1 overflow-y-auto"><SidebarNav /></div>
      </aside>
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={<Brand />} side="left" width="max-w-[18rem]">
        <div className="-mx-5 -my-4"><SidebarNav onNavigate={() => setMenuOpen(false)} /></div>
      </Drawer>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-5">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation" aria-expanded={menuOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-text lg:hidden">
            <Menu size={19} aria-hidden="true" />
          </button>
          <div className="lg:hidden"><Brand /></div>
          <div className="flex-1" />
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-3 hover:text-text md:inline-flex">
            View site <ExternalLink size={14} aria-hidden="true" />
          </a>
          <NotificationBell />
          <UserMenu />
        </header>
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-[1400px] px-4 py-6 focus:outline-none sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

/** Shown while the session loads: the same frame with placeholders, so nothing jumps. */
export function ShellSkeleton() {
  return (
    <div className="min-h-dvh bg-bg" role="status" aria-label="Loading the dashboard">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-bg-2 lg:block">
        <div className="h-14 border-b border-line" />
        <div className="space-y-2 p-4">{Array.from({ length: 9 }, (_, i) => <div key={i} className="h-6 animate-pulse rounded-md bg-surface-3" />)}</div>
      </aside>
      <div className="lg:pl-60">
        <div className="h-14 border-b border-line" />
        <div className="space-y-4 p-6">
          <div className="h-7 w-48 animate-pulse rounded-md bg-surface-3" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />)}</div>
        </div>
      </div>
    </div>
  );
}
