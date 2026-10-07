'use client';

import { ArrowLeft, Download, FileText, Mail, Phone, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { adminApi, ApiError, download, errorMessage } from '@/lib/admin/api';
import { LEAD_STATUSES, leadStatus, SOURCE_LABELS } from '@/lib/admin/constants';
import { formatBytes, formatDateTime, timeAgo } from '@/lib/admin/format';
import { useResource } from '@/lib/admin/hooks';
import type { Attachment, LeadDetail as Lead, LeadStatus, StaffOption } from '@/lib/admin/types';
import { useSession } from '../SessionProvider';
import { AButton, ALink } from '../ui/Button';
import { SelectField, TextArea } from '../ui/Field';
import { ConfirmDialog } from '../ui/Modal';
import { Card, CardHeader, DefinitionList } from '../ui/Layout';
import { ErrorState, Skeleton } from '../ui/States';
import { StatusPill } from '../ui/StatusPill';
import { useToast } from '../ui/Toast';

/** Attachment rows with authenticated download. */
export function AttachmentList({ items }: { items: Attachment[] }) {
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  if (!items.length) return <p className="text-sm text-subtle">No files attached.</p>;
  const get = async (a: Attachment) => {
    setBusy(a.id);
    try { await download(`/attachments/${a.id}/download`, a.name); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(null); }
  };
  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-3 px-3 py-2">
          <FileText size={16} aria-hidden="true" className="shrink-0 text-subtle" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-text">{a.name}</p>
            <p className="text-xs text-subtle">{formatBytes(a.size)}</p>
          </div>
          <AButton size="sm" variant="ghost" loading={busy === a.id} onClick={() => get(a)} icon={<Download size={14} aria-hidden="true" />} aria-label={`Download ${a.name}`}>Download</AButton>
        </li>
      ))}
    </ul>
  );
}

export function LeadDetail({ id }: { id: number }) {
  const router = useRouter();
  const toast = useToast();
  const { can } = useSession();
  const res = useResource(() => adminApi.get<Lead>(`/leads/${id}`), [id]);
  const staff = useResource(() => adminApi.get<StaffOption[]>('/users/options'), []);
  const [saving, setSaving] = useState<'status' | 'assign' | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (res.error) {
    const notFound = res.error instanceof ApiError && res.error.status === 404;
    return (
      <>
        <BackLink />
        <Card>{notFound ? <p className="px-6 py-14 text-center text-muted">This lead doesn&apos;t exist or was deleted.</p> : <ErrorState error={res.error} onRetry={res.reload} />}</Card>
      </>
    );
  }
  if (!res.data) {
    return (
      <div role="status" aria-label="Loading lead">
        <BackLink />
        <Skeleton className="mb-4 h-8 w-72" />
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 rounded-xl lg:col-span-2" /><Skeleton className="h-72 rounded-xl" /></div>
      </div>
    );
  }
  const lead = res.data;

  /** Optimistic update: show the change at once, roll back with a toast if the API refuses. */
  const update = async (patch: { status?: LeadStatus; assignedTo?: number | null }, kind: 'status' | 'assign') => {
    const before = lead;
    const staffName = patch.assignedTo ? staff.data?.find((s) => s.id === patch.assignedTo)?.name ?? '' : '';
    res.setData((l) => l && {
      ...l,
      ...(patch.status && { status: patch.status, statusLabel: leadStatus(patch.status).label }),
      ...(patch.assignedTo !== undefined && { assignedTo: patch.assignedTo ? { id: patch.assignedTo, name: staffName } : null }),
    });
    setSaving(kind);
    try {
      const updated = await adminApi.patch<Lead>(`/leads/${id}`, patch);
      res.setData(() => updated);
      toast.success(kind === 'status' ? `Status set to ${updated.statusLabel}.` : updated.assignedTo ? `Assigned to ${updated.assignedTo.name}.` : 'Lead unassigned.');
    } catch (e) {
      res.setData(() => before);
      toast.error(errorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const addNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) { setNoteError('Write a note first.'); return; }
    setAddingNote(true);
    setNoteError(null);
    try {
      const updated = await adminApi.post<Lead>(`/leads/${id}/notes`, { body: note.trim() });
      res.setData(() => updated);
      setNote('');
      toast.success('Note added.');
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setNoteError(Object.values(err.fieldErrors)[0]);
      else toast.error(errorMessage(err));
    } finally {
      setAddingNote(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await adminApi.del(`/leads/${id}`);
      toast.success(`Lead ${lead.refNo} deleted.`);
      router.push('/admin/leads');
    } catch (e) {
      toast.error(errorMessage(e));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const st = leadStatus(lead.status);
  return (
    <>
      <BackLink />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-subtle">{lead.refNo} · {SOURCE_LABELS[lead.source] || lead.source}</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-xl font-semibold text-text sm:text-2xl">
            {lead.name} <StatusPill tone={st.tone}>{lead.statusLabel}</StatusPill>
          </h1>
          <p className="mt-1 text-sm text-muted">{lead.company || 'No company given'} · received {formatDateTime(lead.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${lead.email}?subject=${encodeURIComponent(`Your enquiry ${lead.refNo}`)}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-strong">
            <Mail size={15} aria-hidden="true" /> Reply by email
          </a>
          {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-4 text-sm text-text hover:bg-white/[0.06]"><Phone size={15} aria-hidden="true" /> Call</a>}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card aria-labelledby="lead-contact">
            <CardHeader id="lead-contact" title="Contact & project" />
            <div className="p-4">
              <DefinitionList items={[
                { term: 'Email', value: <a href={`mailto:${lead.email}`} className="text-brand-soft hover:text-text">{lead.email}</a> },
                { term: 'Phone', value: lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="text-brand-soft hover:text-text">{lead.phone}</a> },
                { term: 'Company', value: lead.company },
                { term: 'Project type', value: lead.needs.length > 1 ? lead.needs.join(', ') : lead.projectType },
                { term: 'Budget', value: lead.budget },
                { term: 'Timeline', value: lead.timeline },
                { term: 'Heard about us', value: lead.heardFrom },
                { term: 'Last updated', value: formatDateTime(lead.updatedAt) },
              ]} />
              <div className="mt-5">
                <h3 className="text-xs text-subtle">Message</h3>
                <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-line bg-bg-2/60 p-3 text-sm leading-relaxed text-text">{lead.message || '—'}</p>
              </div>
              <div className="mt-5">
                <h3 className="mb-1.5 text-xs text-subtle">Attachments</h3>
                <AttachmentList items={lead.attachments} />
              </div>
            </div>
          </Card>

          <Card aria-labelledby="lead-notes">
            <CardHeader id="lead-notes" title={`Notes${lead.notes.length ? ` (${lead.notes.length})` : ''}`} description="Internal only. The client never sees these." />
            <div className="p-4">
              <form onSubmit={addNote} className="space-y-2">
                <TextArea label="Add a note" hideLabel placeholder="Call summary, next step, anything the team should know…" rows={3} value={note} maxLength={5000}
                  onChange={(e) => { setNote(e.target.value); if (noteError) setNoteError(null); }} error={noteError} />
                <div className="flex justify-end"><AButton type="submit" variant="primary" size="sm" loading={addingNote}>Add note</AButton></div>
              </form>
              {lead.notes.length > 0 && (
                <ol className="mt-4 space-y-3">
                  {lead.notes.map((n) => (
                    <li key={n.id} className="rounded-lg border border-line bg-bg-2/50 p-3">
                      <p className="whitespace-pre-wrap break-words text-sm text-text">{n.body}</p>
                      <p className="mt-1.5 text-xs text-subtle">{n.author} · <time title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</time></p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card aria-labelledby="lead-manage">
            <CardHeader id="lead-manage" title="Pipeline" />
            <div className="space-y-4 p-4">
              <SelectField label="Status" value={lead.status} disabled={saving === 'status'} onChange={(e) => update({ status: e.target.value as LeadStatus }, 'status')}
                hint={lead.status === 'spam' ? 'Spam is hidden from the default list and the stats.' : undefined}>
                {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SelectField>
              <SelectField label="Assigned to" value={lead.assignedTo ? String(lead.assignedTo.id) : ''} disabled={saving === 'assign' || !staff.data}
                onChange={(e) => update({ assignedTo: e.target.value ? Number(e.target.value) : null }, 'assign')}>
                <option value="">Unassigned</option>
                {lead.assignedTo && !staff.data?.some((s) => s.id === lead.assignedTo!.id) && <option value={lead.assignedTo.id}>{lead.assignedTo.name}</option>}
                {staff.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
              {can('leads.delete') && (
                <div className="border-t border-line pt-4">
                  <AButton variant="danger-ghost" size="sm" onClick={() => setConfirmDelete(true)} icon={<Trash2 size={14} aria-hidden="true" />}>Delete lead</AButton>
                </div>
              )}
            </div>
          </Card>

          <Card aria-labelledby="lead-activity">
            <CardHeader id="lead-activity" title="Activity" />
            {lead.activity.length === 0 ? <p className="p-4 text-sm text-muted">No activity yet.</p> : (
              <ol className="relative space-y-3 p-4 before:absolute before:bottom-5 before:left-[1.32rem] before:top-5 before:w-px before:bg-line">
                {lead.activity.map((a) => (
                  <li key={a.id} className="relative flex gap-3">
                    <span aria-hidden="true" className="relative z-[1] mt-1.5 h-2 w-2 shrink-0 rounded-full border border-brand-soft/60 bg-surface" />
                    <div className="min-w-0 text-sm">
                      <p className="break-words text-text">{a.summary}</p>
                      <p className="text-xs text-subtle">{a.actor} · <time title={formatDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</time></p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog open={confirmDelete} title={`Delete lead ${lead.refNo}?`} busy={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={remove}
        description={<>This permanently removes {lead.name}&apos;s enquiry, its notes and {lead.attachments.length} attached file{lead.attachments.length === 1 ? '' : 's'}. It can&apos;t be undone. To hide a lead without deleting it, mark it as Spam or Lost.</>} />
    </>
  );
}

function BackLink() {
  return <ALink href="/admin/leads" variant="ghost" size="sm" className="-ml-3 mb-3" icon={<ArrowLeft size={15} aria-hidden="true" />}>All leads</ALink>;
}
