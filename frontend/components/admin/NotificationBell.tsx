'use client';

import { Bell, Briefcase, CheckCheck, Inbox, Mail, MessageSquare, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorMessage } from '@/lib/admin/api';
import { timeAgo } from '@/lib/admin/format';
import { useVisiblePolling } from '@/lib/admin/hooks';
import type { NotificationItem, NotificationsResponse } from '@/lib/admin/types';
import { usePopover } from './usePopover';
import { useToast } from './ui/Toast';

const TYPE_ICON = { lead: Inbox, contact: Mail, application: Briefcase, project: Sparkles, system: MessageSquare } as Record<string, typeof Inbox>;

/** Bell with unread count; polls every 60 s while the tab is visible. */
export function NotificationBell() {
  const router = useRouter();
  const toast = useToast();
  const { open, setOpen, ref, buttonRef } = usePopover();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    adminApi.get<NotificationsResponse>('/notifications').then((d) => { setData(d); setFailed(false); }, () => setFailed(true));
  }, []);
  useEffect(() => { load(); }, [load]);
  useVisiblePolling(load, 60_000);
  useEffect(() => { if (open) load(); }, [open, load]);

  const markRead = async (ids: number[] | 'all') => {
    try {
      setData(await adminApi.post<NotificationsResponse>('/notifications/read', { ids }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const openItem = (n: NotificationItem) => {
    if (!n.read) void markRead([n.id]);
    setOpen(false);
    if (n.link && n.link.startsWith('/admin')) router.push(n.link);
  };

  const unread = data?.unread ?? 0;
  return (
    <div ref={ref} className="relative">
      <button ref={buttonRef} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/[0.07] hover:text-text">
        <Bell size={18} aria-hidden="true" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.625rem] font-semibold leading-4 text-white tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-14 z-50 overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-2xl shadow-black/60 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-sm font-semibold text-text">Notifications</h2>
            {unread > 0 && (
              <button type="button" onClick={() => markRead('all')} className="inline-flex items-center gap-1 rounded text-xs text-brand-soft hover:text-text">
                <CheckCheck size={14} aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60dvh] overflow-y-auto">
            {failed && !data ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Couldn&apos;t load notifications.</p>
            ) : !data ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>
            ) : !data.items.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {data.items.map((n) => {
                  const I = TYPE_ICON[n.type] || Bell;
                  return (
                    <li key={n.id} className="border-b border-line/60 last:border-0">
                      <button type="button" onClick={() => openItem(n)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-white/[0.04] ${n.read ? '' : 'bg-brand/[0.06]'}`}>
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${n.read ? 'bg-white/[0.04] text-subtle' : 'bg-brand/15 text-brand-soft'}`}><I size={14} aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm ${n.read ? 'text-muted' : 'font-medium text-text'}`}>{n.title}</span>
                          {n.body && <span className="block truncate text-xs text-subtle">{n.body}</span>}
                          <span className="mt-0.5 block text-[0.7rem] text-subtle">{timeAgo(n.createdAt)}{!n.read && <span className="sr-only"> · unread</span>}</span>
                        </span>
                        {!n.read && <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-soft" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
