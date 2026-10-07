'use client';

import { Download, ExternalLink, Mail, Paperclip, Phone, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { adminApi, ApiError, download, errorMessage, qs } from '@/lib/admin/api';
import { APPLICATION_STATUSES, applicationStatus } from '@/lib/admin/constants';
import { formatDateTime, timeAgo } from '@/lib/admin/format';
import { useResource, useUrlSearch, useUrlState } from '@/lib/admin/hooks';
import type { Application, ApplicationDetail, ApplicationStatus, ContentList, Paged } from '@/lib/admin/types';
import { useSession } from '../SessionProvider';
import { AdminTable, type Column } from '../ui/AdminTable';
import { AButton } from '../ui/Button';
import { SearchInput, Select, SelectField, TextArea } from '../ui/Field';
import { Drawer } from '../ui/Drawer';
import { ConfirmDialog } from '../ui/Modal';
import { Card, DefinitionList, FilterBar, PageHeader } from '../ui/Layout';
import { Pagination } from '../ui/Pagination';
import { EmptyState, ErrorState, SkeletonRows, Spinner } from '../ui/States';
import { StatusPill } from '../ui/StatusPill';
import { useToast } from '../ui/Toast';
import { AttachmentList } from './LeadDetail';

const KEYS = ['q', 'status', 'roleId', 'sort', 'page', 'open'] as const;

const linkHref = (l: string) => (/^https?:\/\//i.test(l) ? l : `https://${l}`);

export function ApplicationsPage() {
  const toast = useToast();
  const { can } = useSession();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useUrlSearch(f.q, (v) => setF({ q: v }));
  const filters = { q: f.q, status: f.status, roleId: f.roleId, sort: f.sort };
  const page = Math.max(1, Number(f.page) || 1);
  const list = useResource(() => adminApi.get<Paged<Application>>('/applications', { ...filters, page, pageSize: 25 }), [JSON.stringify(filters), page]);
  // Role names come from the CMS; staff without content access fall back to roles seen in the list.
  const roles = useResource(async () => {
    try {
      const r = await adminApi.get<ContentList>('/content/roles', { pageSize: 200 });
      return r.items.map((x) => ({ id: x.id, title: String(x.title) }));
    } catch {
      return null;
    }
  }, []);
  const roleOptions = roles.data ?? [...new Map((list.data?.items ?? []).map((a) => [a.roleId, { id: a.roleId, title: a.roleTitle }])).values()];
  const [exporting, setExporting] = useState(false);
  const openId = Number(f.open) || null;

  const exportCsv = async () => {
    setExporting(true);
    try { await download(`/applications/export.csv${qs(filters)}`, 'aspr-applications.csv'); toast.success('Export downloaded.'); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setExporting(false); }
  };

  const columns: Column<Application>[] = [
    { key: 'name', header: 'Applicant', sort: { desc: 'name' }, cell: (a) => (
      <div><button type="button" onClick={() => setF({ open: String(a.id), page: f.page })} className="font-medium text-text hover:text-brand-soft">{a.name}</button>
        <p className="text-xs text-subtle">{a.refNo} · {a.email}</p></div>
    ) },
    { key: 'role', header: 'Role', cell: (a) => <span className="text-muted">{a.roleTitle}</span> },
    { key: 'status', header: 'Status', cell: (a) => <StatusPill tone={applicationStatus(a.status).tone}>{applicationStatus(a.status).label}</StatusPill> },
    { key: 'files', header: <span className="sr-only">Files</span>, className: 'text-subtle', cell: (a) => a.attachmentCount ? <span className="inline-flex items-center gap-0.5 text-xs"><Paperclip size={13} aria-hidden="true" />{a.attachmentCount}<span className="sr-only"> files</span></span> : null },
    { key: 'created', header: 'Received', sort: { desc: 'newest', asc: 'oldest' }, headerClassName: 'text-right', className: 'whitespace-nowrap text-right text-muted', cell: (a) => timeAgo(a.createdAt) },
  ];

  const onChanged = (a: ApplicationDetail) => list.setData((d) => d && { ...d, items: d.items.map((x) => (x.id === a.id ? { ...x, ...a } : x)) });

  return (
    <>
      <PageHeader title="Applications" description="People applying for open roles. Look at the work first."
        actions={<AButton onClick={exportCsv} loading={exporting} icon={<Download size={15} aria-hidden="true" />}>Export CSV</AButton>} />
      <Card>
        <FilterBar>
          <SearchInput label="Search applications" placeholder="Search name, email, ref, links…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" />
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle">Status</span>
            <Select value={f.status} onChange={(e) => setF({ status: e.target.value })}>
              <option value="">Any status</option>
              {APPLICATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle">Role</span>
            <Select value={f.roleId} onChange={(e) => setF({ roleId: e.target.value })}>
              <option value="">Any role</option>
              {roleOptions.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </Select>
          </label>
        </FilterBar>
        {list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data ? <SkeletonRows />
          : !list.data.items.length ? (
            <EmptyState title={f.q || f.status || f.roleId ? 'No applications match' : 'No applications yet'}>
              {f.q || f.status || f.roleId ? 'Try clearing the filters.' : 'When someone applies for an open role, it shows up here.'}
            </EmptyState>
          ) : (
            <div className={list.loading ? 'opacity-60' : ''}>
              <AdminTable caption="Job applications" columns={columns} rows={list.data.items} rowKey={(a) => a.id}
                sort={f.sort || 'newest'} onSort={(v) => setF({ sort: v === 'newest' ? '' : v })}
                onRowClick={(a) => setF({ open: String(a.id), page: f.page })} rowLabel={(a) => `Open application from ${a.name}`}
                mobileCard={(a) => (
                  <button type="button" onClick={() => setF({ open: String(a.id), page: f.page })} className="block w-full px-4 py-3 text-left hover:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate font-medium text-text">{a.name}</p>
                      <StatusPill tone={applicationStatus(a.status).tone}>{applicationStatus(a.status).label}</StatusPill>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">{a.roleTitle}</p>
                    <p className="mt-0.5 text-xs text-subtle">{a.refNo} · {timeAgo(a.createdAt)}</p>
                  </button>
                )} />
              <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} pageSize={list.data.pageSize} noun="applications" onPage={(p) => setF({ page: p > 1 ? String(p) : '' })} />
            </div>
          )}
      </Card>
      <ApplicationDrawer id={openId} canDelete={can('leads.delete')} onClose={() => setF({ open: '', page: f.page })} onChanged={onChanged}
        onDeleted={() => { setF({ open: '', page: f.page }); list.reload(); }} />
    </>
  );
}

function ApplicationDrawer({ id, canDelete, onClose, onChanged, onDeleted }: {
  id: number | null; canDelete: boolean; onClose: () => void; onChanged: (a: ApplicationDetail) => void; onDeleted: () => void;
}) {
  const toast = useToast();
  const res = useResource(() => (id ? adminApi.get<ApplicationDetail>(`/applications/${id}`) : Promise.resolve(null)), [id]);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const a = res.data;
  useEffect(() => { setNotes(a?.notes ?? ''); }, [a?.id, a?.notes]);

  const patch = async (body: { status?: ApplicationStatus; notes?: string }) => {
    const updated = await adminApi.patch<ApplicationDetail>(`/applications/${id}`, body);
    res.setData(() => updated);
    onChanged(updated);
    return updated;
  };
  const setStatus = async (s: ApplicationStatus) => {
    if (!a) return;
    const before = a;
    res.setData((x) => x && { ...x, status: s });
    setStatusBusy(true);
    try { await patch({ status: s }); toast.success(`Status set to ${applicationStatus(s).label}.`); }
    catch (e) { res.setData(() => before); toast.error(errorMessage(e)); }
    finally { setStatusBusy(false); }
  };
  const saveNotes = async () => {
    setSavingNotes(true);
    try { await patch({ notes }); toast.success('Notes saved.'); }
    catch (e) { toast.error(e instanceof ApiError && e.fieldErrors ? Object.values(e.fieldErrors)[0] : errorMessage(e)); }
    finally { setSavingNotes(false); }
  };
  const remove = async () => {
    setDeleting(true);
    try { await adminApi.del(`/applications/${id}`); toast.success('Application deleted.'); setConfirm(false); onDeleted(); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setDeleting(false); }
  };

  const links = (a?.portfolio || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return (
    <>
      <Drawer open={id !== null} onClose={onClose} title={a ? a.name : 'Application'} subtitle={a ? `${a.refNo} · ${a.roleTitle}` : undefined}
        footer={a && canDelete ? <AButton variant="danger-ghost" size="sm" onClick={() => setConfirm(true)} icon={<Trash2 size={14} aria-hidden="true" />}>Delete application</AButton> : undefined}>
        {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : !a ? <Spinner /> : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${a.email}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[0.8125rem] font-medium text-white hover:bg-brand-strong"><Mail size={14} aria-hidden="true" />Email</a>
              {a.phone && <a href={`tel:${a.phone.replace(/[^\d+]/g, '')}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[0.8125rem] text-text hover:bg-white/[0.06]"><Phone size={14} aria-hidden="true" />Call</a>}
            </div>
            <SelectField label="Status" value={a.status} disabled={statusBusy} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>
              {APPLICATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </SelectField>
            <DefinitionList items={[
              { term: 'Email', value: <a className="text-brand-soft hover:text-text" href={`mailto:${a.email}`}>{a.email}</a> },
              { term: 'Phone', value: a.phone },
              { term: 'Role', value: a.roleTitle },
              { term: 'Received', value: formatDateTime(a.createdAt) },
            ]} />
            <div>
              <h3 className="mb-1.5 text-xs text-subtle">Work links</h3>
              {links.length ? (
                <ul className="space-y-1">
                  {links.map((l) => <li key={l}><a href={linkHref(l)} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex max-w-full items-center gap-1 break-all text-sm text-brand-soft hover:text-text">{l}<ExternalLink size={12} aria-hidden="true" className="shrink-0" /></a></li>)}
                </ul>
              ) : <p className="text-sm text-subtle">No links given.</p>}
            </div>
            <div>
              <h3 className="mb-1.5 text-xs text-subtle">Message</h3>
              <p className="whitespace-pre-wrap break-words rounded-lg border border-line bg-bg-2/60 p-3 text-sm text-text">{a.message || '—'}</p>
            </div>
            <div>
              <h3 className="mb-1.5 text-xs text-subtle">Files</h3>
              <AttachmentList items={a.attachments} />
            </div>
            <div>
              <TextArea label="Internal notes" hint="Only staff see these." rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
              <div className="mt-2 flex justify-end">
                <AButton size="sm" variant="primary" onClick={saveNotes} loading={savingNotes} disabled={notes === (a.notes ?? '')}>Save notes</AButton>
              </div>
            </div>
          </div>
        )}
      </Drawer>
      <ConfirmDialog open={confirm} title="Delete this application?" busy={deleting} onCancel={() => setConfirm(false)} onConfirm={remove}
        description="The application, its notes and attached files are removed for good." />
    </>
  );
}
