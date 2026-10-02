'use client';
import { useEffect, useState } from 'react';
import { admin } from '../../lib/api';
import { Drawer, Empty, ErrorBox, fmtDate, fmtSize, label, Loading, Pager, Pill, useDebounced } from './ui';
import { useResource } from './useResource';

// Applications store one or more work links, one per line.
const links = (p) => String(p || '').split(/\s*\n\s*/).filter(Boolean);
const href = (l) => (/^https?:/.test(l) ? l : 'https://' + l);

export const KINDS = {
  enquiries: {
    title: 'Enquiries', eyebrow: 'PROJECT BRIEFS', singular: 'Enquiry',
    statuses: ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'],
    extraFilter: { key: 'source', label: 'All sources', options: ['brief-builder', 'contact-page', 'product-demo', 'chat'] },
    columns: (r) => [
      <><b>{r.name}</b><div className="sub">{r.company || r.email}</div></>,
      <div className="ad-chips">{r.needs.slice(0, 3).map((n) => <span key={n} className="ad-pill">{n}</span>)}{r.needs.length > 3 ? <span className="sub">+{r.needs.length - 3}</span> : null}</div>,
      <>{r.budget || '—'}<div className="sub">{r.timeline || ''}</div></>,
      <Pill value={r.status} />,
      <><span className="sub">{r.refNo}</span><div className="sub">{fmtDate(r.createdAt)}</div></>,
    ],
    headers: ['From', 'Needs', 'Budget', 'Status', 'Received'],
    details: (r) => [
      ['Reference', r.refNo], ['Received', fmtDate(r.createdAt)], ['Source', label(r.source)], ['Email', <a href={'mailto:' + r.email}>{r.email}</a>],
      ['Phone', <a href={'tel:' + r.phone.replace(/[^\d+]/g, '')}>{r.phone}</a>], ['Company', r.company || '—'], ['Reply via', r.contactMethod],
      ['Budget', r.budget || '—'], ['Timeline', r.timeline || '—'], ['Needs', r.needs.join(', ')], ['Suggested package', r.suggestedPackage || '—'],
    ],
  },
  applications: {
    title: 'Applications', eyebrow: 'CAREERS', singular: 'Application',
    statuses: ['new', 'shortlisted', 'task-sent', 'interview', 'offer', 'rejected'],
    extraFilter: { key: 'roleId', label: 'All roles', options: [] }, // filled from roles
    columns: (r) => [
      <><b>{r.name}</b><div className="sub">{r.email}</div></>,
      r.roleTitle,
      r.portfolio ? <><a href={href(links(r.portfolio)[0])} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{links(r.portfolio)[0].replace(/^https?:\/\//, '').slice(0, 32)}</a>{links(r.portfolio).length > 1 ? <span className="sub"> +{links(r.portfolio).length - 1} more</span> : null}</> : <span className="sub">{r.attachmentCount} file(s)</span>,
      <Pill value={r.status} />,
      <><span className="sub">{r.refNo}</span><div className="sub">{fmtDate(r.createdAt)}</div></>,
    ],
    headers: ['Applicant', 'Role', 'Work', 'Status', 'Received'],
    details: (r) => [
      ['Reference', r.refNo], ['Received', fmtDate(r.createdAt)], ['Role', r.roleTitle], ['Email', <a href={'mailto:' + r.email}>{r.email}</a>],
      ['Phone', <a href={'tel:' + r.phone.replace(/[^\d+]/g, '')}>{r.phone}</a>],
      ['Links', r.portfolio ? <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>{links(r.portfolio).map((l) => <a key={l} href={href(l)} target="_blank" rel="noreferrer">{l}</a>)}</span> : '—'],
    ],
  },
};

export default function SubmissionsPanel({ kind, token, toast, onChanged }) {
  const K = KINDS[kind];
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [extra, setExtra] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [roles, setRoles] = useState([]);
  const dq = useDebounced(q);
  useEffect(() => { setPage(1); }, [dq, status, extra, sort]);
  useEffect(() => {
    if (kind === 'applications') admin.list(token, 'content/roles').then((r) => setRoles(r.items)).catch(() => {});
  }, [kind, token]);
  const params = { q: dq, status, [K.extraFilter.key]: extra, sort, page, pageSize: 20 };
  const list = useResource(() => admin.list(token, kind, params), [token, kind, dq, status, extra, sort, page]);
  const extraOptions = kind === 'applications' ? roles.map((r) => [String(r.id), r.title]) : K.extraFilter.options.map((o) => [o, label(o)]);

  const exportCsv = async () => {
    const qs = new URLSearchParams(Object.entries({ q: dq, status, [K.extraFilter.key]: extra }).filter(([, v]) => v)).toString();
    try { await admin.download(token, `/api/admin/${kind}/export.csv${qs ? '?' + qs : ''}`, `aspr-${kind}.csv`); } catch (e) { toast(e.message, true); }
  };

  const data = list.data;
  const filtered = dq || status || extra;
  return (
    <>
      <div className="ad-top">
        <div><p className="ad-eyebrow">{K.eyebrow}</p><h1>{K.title}</h1></div>
        <button type="button" className="ad-btn ghost" onClick={exportCsv}><span className="ms">download</span>Export CSV</button>
      </div>
      <div className="ad-bar">
        <input className="ad-input ad-search" type="search" placeholder="Search name, email, reference…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select className="ad-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>{K.statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <select className="ad-select" value={extra} onChange={(e) => setExtra(e.target.value)} aria-label={K.extraFilter.label}>
          <option value="">{K.extraFilter.label}</option>{extraOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="ad-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option>
        </select>
      </div>
      <ErrorBox error={list.error} retry={list.reload} />
      {list.loading && !data ? <Loading /> : data && !data.items.length ? (
        <div className="ad-card"><Empty title={filtered ? 'Nothing matches those filters.' : `No ${K.title.toLowerCase()} yet.`}
          body={filtered ? 'Try a different search or clear the filters.' : 'New submissions from the website appear here instantly.'}
          action={filtered ? <button type="button" className="ad-btn ghost" onClick={() => { setQ(''); setStatus(''); setExtra(''); }}>Clear filters</button> : null} /></div>
      ) : data ? (
        <>
          <div className="ad-table-wrap" style={{ opacity: list.loading ? 0.6 : 1 }}>
            <table className="ad-table">
              <thead><tr>{K.headers.map((h) => <th key={h}>{h.toUpperCase()}</th>)}</tr></thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(r.id); }}>
                    {K.columns(r).map((c, i) => <td key={i}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      ) : null}
      {openId ? <Detail kind={kind} id={openId} token={token} toast={toast} onClose={() => setOpenId(null)}
        onChanged={() => { list.reload(); onChanged && onChanged(); }} /> : null}
    </>
  );
}

function Detail({ kind, id, token, toast, onClose, onChanged }) {
  const K = KINDS[kind];
  const item = useResource(() => admin.get(token, kind, id), [token, kind, id]);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (item.data) { setStatus(item.data.status); setNotes(item.data.notes || ''); } }, [item.data]);
  const r = item.data;
  const dirty = r && (status !== r.status || notes !== (r.notes || ''));

  const save = async () => {
    setSaving(true);
    try { await admin.update(token, kind, id, { status, notes }); toast(`${K.singular} updated`); item.reload(); onChanged(); }
    catch (e) { toast(e.message, true); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete this ${K.singular.toLowerCase()} and its attachments? This can't be undone.`)) return;
    try { await admin.remove(token, kind, id); toast(`${K.singular} deleted`); onChanged(); onClose(); } catch (e) { toast(e.message, true); }
  };
  return (
    <Drawer eyebrow={K.singular.toUpperCase()} title={r ? r.name : 'Loading…'} onClose={onClose}>
      <ErrorBox error={item.error} retry={item.reload} />
      {!r ? <Loading /> : (
        <>
          <dl className="ad-kv">{K.details(r).map(([k, v]) => <FragmentKV key={k} k={k} v={v} />)}</dl>
          {r.message ? <><p className="ad-label">{kind === 'enquiries' ? 'Brief' : 'Message'}</p><div className="ad-msg">{r.message}</div></> : null}
          <p className="ad-label">Attachments</p>
          {r.attachments.length ? r.attachments.map((a) => (
            <div key={a.id} className="ad-file"><span>{a.name} <span className="sub" style={{ color: '#5A6380' }}>· {fmtSize(a.size)}</span></span>
              <button type="button" className="ad-mini" onClick={() => admin.download(token, `/api/admin/attachments/${a.id}/download`, a.name).catch((e) => toast(e.message, true))}>Download</button></div>
          )) : <p className="ad-help" style={{ marginBottom: 16 }}>No files attached.</p>}
          <div className="ad-field" style={{ marginTop: 16 }}>
            <label htmlFor="d-status">Status</label>
            <select id="d-status" className="ad-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {K.statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </div>
          <div className="ad-field">
            <label htmlFor="d-notes">Internal notes</label>
            <textarea id="d-notes" className="ad-textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call summary, next step, owner…" />
          </div>
          <div className="ad-row-actions">
            <button type="button" className="ad-btn danger" onClick={remove}><span className="ms">delete</span>Delete</button>
            <button type="button" className="ad-btn" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </>
      )}
    </Drawer>
  );
}

function FragmentKV({ k, v }) {
  return <><dt>{k}</dt><dd>{v}</dd></>;
}
