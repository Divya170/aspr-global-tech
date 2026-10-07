'use client';

import { Download, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminApi, download, errorMessage, qs } from '@/lib/admin/api';
import { formatDate } from '@/lib/admin/format';
import { useResource, useUrlSearch, useUrlState } from '@/lib/admin/hooks';
import type { Paged, Subscriber } from '@/lib/admin/types';
import { AdminTable, type Column } from '../ui/AdminTable';
import { AButton, IconButton } from '../ui/Button';
import { SearchInput, Select } from '../ui/Field';
import { ConfirmDialog } from '../ui/Modal';
import { Card, FilterBar, PageHeader } from '../ui/Layout';
import { Pagination } from '../ui/Pagination';
import { EmptyState, ErrorState, SkeletonRows } from '../ui/States';
import { StatusPill } from '../ui/StatusPill';
import { useToast } from '../ui/Toast';

const KEYS = ['q', 'status', 'page'] as const;

export function SubscribersPage() {
  const toast = useToast();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useUrlSearch(f.q, (v) => setF({ q: v }));
  const page = Math.max(1, Number(f.page) || 1);
  const list = useResource(() => adminApi.get<Paged<Subscriber>>('/subscribers', { q: f.q, status: f.status, page, pageSize: 50 }), [f.q, f.status, page]);
  const [busy, setBusy] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const toggle = async (s: Subscriber) => {
    const status = s.status === 'active' ? 'unsubscribed' : 'active';
    setBusy(s.id);
    try {
      const updated = await adminApi.patch<Subscriber>(`/subscribers/${s.id}`, { status });
      list.setData((d) => d && { ...d, items: d.items.map((x) => (x.id === s.id ? updated : x)) });
      toast.success(status === 'active' ? `${s.email} reactivated.` : `${s.email} unsubscribed.`);
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(null); }
  };
  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try { await adminApi.del(`/subscribers/${toDelete.id}`); toast.success(`${toDelete.email} deleted.`); setToDelete(null); list.reload(); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setDeleting(false); }
  };
  const exportCsv = async () => {
    setExporting(true);
    try { await download(`/subscribers/export.csv${qs({ q: f.q, status: f.status })}`, 'aspr-subscribers.csv'); toast.success('Export downloaded.'); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setExporting(false); }
  };

  const actions = (s: Subscriber) => (
    <div className="flex items-center justify-end gap-1">
      <AButton size="xs" variant="ghost" loading={busy === s.id} onClick={() => toggle(s)}>{s.status === 'active' ? 'Unsubscribe' : 'Reactivate'}</AButton>
      <IconButton size="sm" label={`Delete ${s.email}`} onClick={() => setToDelete(s)} className="hover:!text-danger"><Trash2 size={14} aria-hidden="true" /></IconButton>
    </div>
  );
  const columns: Column<Subscriber>[] = [
    { key: 'email', header: 'Email', cell: (s) => <a href={`mailto:${s.email}`} className="text-text hover:text-brand-soft">{s.email}</a> },
    { key: 'status', header: 'Status', cell: (s) => <StatusPill tone={s.status === 'active' ? 'success' : 'neutral'}>{s.status === 'active' ? 'Subscribed' : 'Unsubscribed'}</StatusPill> },
    { key: 'source', header: 'Signed up from', headerClassName: 'hidden sm:table-cell', className: 'hidden sm:table-cell text-muted', cell: (s) => s.source || '—' },
    { key: 'date', header: 'Joined', className: 'whitespace-nowrap text-muted', cell: (s) => formatDate(s.createdAt) },
    { key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', cell: actions },
  ];

  return (
    <>
      <PageHeader title="Subscribers" description="Newsletter sign-ups from the website. Export the list to send through your email tool."
        actions={<AButton onClick={exportCsv} loading={exporting} icon={<Download size={15} aria-hidden="true" />}>Export CSV</AButton>} />
      <Card>
        <FilterBar>
          <SearchInput label="Search subscribers" placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" />
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle">Status</span>
            <Select value={f.status} onChange={(e) => setF({ status: e.target.value })}>
              <option value="">Everyone</option>
              <option value="active">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </Select>
          </label>
        </FilterBar>
        {list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data ? <SkeletonRows />
          : !list.data.items.length ? <EmptyState title={f.q || f.status ? 'No subscribers match' : 'No subscribers yet'}>{f.q || f.status ? 'Try clearing the filters.' : 'People who join the newsletter in the footer appear here.'}</EmptyState>
          : (
            <div className={list.loading ? 'opacity-60' : ''}>
              <AdminTable caption="Newsletter subscribers" columns={columns} rows={list.data.items} rowKey={(s) => s.id}
                mobileCard={(s) => (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text">{s.email}</p>
                      <p className="mt-0.5 text-xs text-subtle">{s.status === 'active' ? 'Subscribed' : 'Unsubscribed'} · {formatDate(s.createdAt)}</p>
                    </div>
                    {actions(s)}
                  </div>
                )} />
              <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} pageSize={list.data.pageSize} noun="subscribers" onPage={(p) => setF({ page: p > 1 ? String(p) : '' })} />
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!toDelete} title="Delete subscriber?" busy={deleting} onCancel={() => setToDelete(null)} onConfirm={remove}
        description={<>{toDelete?.email} is removed from the list entirely. To stop emails but keep the record, unsubscribe them instead.</>} />
    </>
  );
}
