'use client';

import { Download, Paperclip, StickyNote, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminApi, download, errorMessage, qs } from '@/lib/admin/api';
import { LEAD_STATUSES, leadStatus, SOURCE_LABELS } from '@/lib/admin/constants';
import { formatDate, timeAgo } from '@/lib/admin/format';
import { useResource, useUrlSearch, useUrlState } from '@/lib/admin/hooks';
import type { Lead, LeadFacets, Paged, StaffOption } from '@/lib/admin/types';
import { AdminTable, type Column } from '../ui/AdminTable';
import { AButton } from '../ui/Button';
import { inputClass, SearchInput, Select } from '../ui/Field';
import { Card, FilterBar, PageHeader } from '../ui/Layout';
import { Pagination } from '../ui/Pagination';
import { EmptyState, ErrorState, SkeletonRows } from '../ui/States';
import { StatusPill } from '../ui/StatusPill';
import { useToast } from '../ui/Toast';

const KEYS = ['q', 'status', 'projectType', 'budget', 'source', 'assignedTo', 'from', 'to', 'sort', 'page'] as const;
const PAGE_SIZE = 25;

function FilterSelect({ label, value, onChange, children, className = '' }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>{children}</Select>
    </label>
  );
}

export function LeadsPage() {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useUrlSearch(f.q, (v) => setF({ q: v }));

  const facets = useResource(() => adminApi.get<LeadFacets>('/leads/facets'), []);
  const staff = useResource(() => adminApi.get<StaffOption[]>('/users/options'), []);
  const filters = { q: f.q, status: f.status, projectType: f.projectType, budget: f.budget, source: f.source, assignedTo: f.assignedTo, from: f.from, to: f.to, sort: f.sort };
  const page = Math.max(1, Number(f.page) || 1);
  const list = useResource(() => adminApi.get<Paged<Lead>>('/leads', { ...filters, page, pageSize: PAGE_SIZE }), [JSON.stringify(filters), page]);
  const [exporting, setExporting] = useState(false);

  const active = Object.entries(filters).filter(([k, v]) => v && k !== 'sort' && k !== 'q').length + (f.q ? 1 : 0);
  const sort = f.sort || 'newest';

  const exportCsv = async () => {
    setExporting(true);
    try { await download(`/leads/export.csv${qs(filters)}`, 'aspr-leads.csv'); toast.success('Export downloaded.'); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setExporting(false); }
  };

  const columns: Column<Lead>[] = [
    { key: 'name', header: 'Lead', sort: { desc: 'name' }, cell: (l) => (
      <div className="min-w-0">
        <Link href={`/admin/leads/${l.id}`} className="font-medium text-text hover:text-brand-soft">{l.name}</Link>
        <p className="truncate text-xs text-subtle">{l.refNo}{l.company ? ` · ${l.company}` : ''}</p>
      </div>
    ) },
    { key: 'project', header: 'Project', cell: (l) => <div className="text-muted"><p className="text-text/90">{l.projectType || '—'}</p><p className="text-xs text-subtle">{l.budget || 'No budget given'}</p></div> },
    { key: 'status', header: 'Status', sort: { desc: 'status' }, cell: (l) => <StatusPill tone={leadStatus(l.status).tone}>{l.statusLabel}</StatusPill> },
    { key: 'assigned', header: 'Assigned', cell: (l) => l.assignedTo ? <span className="text-muted">{l.assignedTo.name}</span> : <span className="text-subtle">Unassigned</span> },
    { key: 'source', header: 'Source', headerClassName: 'hidden xl:table-cell', className: 'hidden xl:table-cell text-muted', cell: (l) => SOURCE_LABELS[l.source] || l.source },
    { key: 'meta', header: <span className="sr-only">Notes and files</span>, className: 'text-subtle', cell: (l) => (
      <span className="flex items-center gap-2 text-xs">
        {!!l.noteCount && <span className="inline-flex items-center gap-0.5" title={`${l.noteCount} notes`}><StickyNote size={13} aria-hidden="true" />{l.noteCount}<span className="sr-only"> notes</span></span>}
        {!!l.attachmentCount && <span className="inline-flex items-center gap-0.5" title={`${l.attachmentCount} files`}><Paperclip size={13} aria-hidden="true" />{l.attachmentCount}<span className="sr-only"> files</span></span>}
      </span>
    ) },
    { key: 'created', header: 'Received', sort: { desc: 'newest', asc: 'oldest' }, className: 'whitespace-nowrap text-right text-muted', headerClassName: 'text-right', cell: (l) => <span title={formatDate(l.createdAt)}>{timeAgo(l.createdAt)}</span> },
    { key: 'updated', header: 'Updated', sort: { desc: 'updated' }, headerClassName: 'hidden 2xl:table-cell text-right', className: 'hidden 2xl:table-cell whitespace-nowrap text-right text-muted', cell: (l) => timeAgo(l.updatedAt) },
  ];

  return (
    <>
      <PageHeader title="Leads" description="Quote requests, contact messages and chat leads. Work them from new to won."
        actions={<AButton onClick={exportCsv} loading={exporting} icon={<Download size={15} aria-hidden="true" />}>Export CSV</AButton>} />
      <Card>
        <FilterBar className="flex-col !items-stretch">
          <div className="flex flex-wrap items-center gap-2">
          <SearchInput label="Search leads" placeholder="Search name, email, company, ref…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-80" />
            {active > 0 && (
              <AButton variant="ghost" size="sm" icon={<X size={14} aria-hidden="true" />}
                onClick={() => { setF({ q: '', status: '', projectType: '', budget: '', source: '', assignedTo: '', from: '', to: '' }); }}>
                Clear filters
              </AButton>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            <FilterSelect label="Status" value={f.status} onChange={(v) => setF({ status: v })}>
              <option value="">All except spam</option>
              <option value="open">Open (not won/lost)</option>
              {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              <option value="all">Everything incl. spam</option>
            </FilterSelect>
            <FilterSelect label="Project" value={f.projectType} onChange={(v) => setF({ projectType: v })}>
              <option value="">Any project</option>
              {facets.data?.projectTypes.map((p) => <option key={p} value={p}>{p}</option>)}
            </FilterSelect>
            <FilterSelect label="Budget" value={f.budget} onChange={(v) => setF({ budget: v })}>
              <option value="">Any budget</option>
              {facets.data?.budgets.map((p) => <option key={p} value={p}>{p}</option>)}
            </FilterSelect>
            <FilterSelect label="Source" value={f.source} onChange={(v) => setF({ source: v })}>
              <option value="">Any source</option>
              {facets.data?.sources.map((p) => <option key={p} value={p}>{SOURCE_LABELS[p] || p}</option>)}
            </FilterSelect>
            <FilterSelect label="Assigned to" value={f.assignedTo} onChange={(v) => setF({ assignedTo: v })}>
              <option value="">Anyone</option>
              <option value="none">Unassigned</option>
              {staff.data?.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </FilterSelect>
            <label className="flex flex-col gap-1">
              <span className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle">From</span>
              <input type="date" value={f.from} max={f.to || undefined} onChange={(e) => setF({ from: e.target.value })} className={`${inputClass} h-9 [color-scheme:dark]`} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle">To</span>
              <input type="date" value={f.to} min={f.from || undefined} onChange={(e) => setF({ to: e.target.value })} className={`${inputClass} h-9 [color-scheme:dark]`} />
            </label>
            <FilterSelect label="Sort" value={sort} onChange={(v) => setF({ sort: v === 'newest' ? '' : v })} className="md:hidden">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="updated">Recently updated</option>
              <option value="name">Name A–Z</option>
              <option value="status">Status</option>
            </FilterSelect>
          </div>
        </FilterBar>
        {list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : list.loading && !list.data ? <SkeletonRows rows={8} />
          : !list.data?.items.length ? (
            <EmptyState title={active ? 'No leads match these filters' : 'No leads yet'}>
              {active ? 'Try a different search or clear the filters.' : 'New quote and contact form submissions will appear here.'}
            </EmptyState>
          ) : (
            <div className={list.loading ? 'opacity-60 transition-opacity' : ''} aria-busy={list.loading}>
              <AdminTable
                caption="Leads"
                columns={columns}
                rows={list.data.items}
                rowKey={(l) => l.id}
                sort={sort}
                onSort={(v) => setF({ sort: v === 'newest' ? '' : v })}
                onRowClick={(l) => router.push(`/admin/leads/${l.id}`)}
                mobileCard={(l) => (
                  <Link href={`/admin/leads/${l.id}`} className="block px-4 py-3 hover:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">{l.name}</p>
                        <p className="truncate text-xs text-subtle">{l.refNo}{l.company ? ` · ${l.company}` : ''}</p>
                      </div>
                      <StatusPill tone={leadStatus(l.status).tone}>{l.statusLabel}</StatusPill>
                    </div>
                    <p className="mt-1.5 truncate text-sm text-muted">{[l.projectType, l.budget].filter(Boolean).join(' · ') || '—'}</p>
                    <p className="mt-1 text-xs text-subtle">{timeAgo(l.createdAt)} · {l.assignedTo ? l.assignedTo.name : 'Unassigned'}</p>
                  </Link>
                )}
              />
              <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} pageSize={list.data.pageSize} noun="leads" onPage={(p) => setF({ page: p > 1 ? String(p) : '' })} />
            </div>
          )}
      </Card>
    </>
  );
}
