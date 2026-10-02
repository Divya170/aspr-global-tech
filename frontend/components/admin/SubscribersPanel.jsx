'use client';
import { useEffect, useState } from 'react';
import { admin } from '../../lib/api';
import { Empty, ErrorBox, fmtDate, Loading, Pager, Pill, useDebounced } from './ui';
import { useResource } from './useResource';

export default function SubscribersPanel({ token, toast }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, status]);
  const list = useResource(() => admin.list(token, 'subscribers', { q: dq, status, page, pageSize: 50 }), [token, dq, status, page]);
  const data = list.data;
  const toggle = async (s) => {
    try { await admin.update(token, 'subscribers', s.id, { status: s.status === 'active' ? 'unsubscribed' : 'active' }); list.reload(); toast('Subscriber updated'); }
    catch (e) { toast(e.message, true); }
  };
  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.email} permanently?`)) return;
    try { await admin.remove(token, 'subscribers', s.id); list.reload(); toast('Subscriber removed'); } catch (e) { toast(e.message, true); }
  };
  return (
    <>
      <div className="ad-top">
        <div><p className="ad-eyebrow">NEWSLETTER</p><h1>Subscribers</h1></div>
        <button type="button" className="ad-btn ghost" onClick={() => admin.download(token, `/api/admin/subscribers/export.csv${status ? '?status=' + status : ''}`, 'aspr-subscribers.csv').catch((e) => toast(e.message, true))}><span className="ms">download</span>Export CSV</button>
      </div>
      <div className="ad-bar">
        <input className="ad-input ad-search" type="search" placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <select className="ad-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All</option><option value="active">Active</option><option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>
      <ErrorBox error={list.error} retry={list.reload} />
      {list.loading && !data ? <Loading /> : data && !data.items.length ? (
        <div className="ad-card"><Empty title={dq || status ? 'No subscribers match.' : 'No subscribers yet.'} body="Sign-ups from the website footer appear here." /></div>
      ) : data ? (
        <>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>EMAIL</th><th>SOURCE</th><th>STATUS</th><th>JOINED</th><th /></tr></thead>
              <tbody>{data.items.map((s) => (
                <tr key={s.id} style={{ cursor: 'default' }}>
                  <td><b>{s.email}</b></td><td className="sub">{s.source}</td><td><Pill value={s.status} /></td><td className="sub">{fmtDate(s.createdAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><button type="button" className="ad-mini" onClick={() => toggle(s)}>{s.status === 'active' ? 'Unsubscribe' : 'Reactivate'}</button>{' '}
                    <button type="button" className="ad-mini" onClick={() => remove(s)} aria-label="Delete">✕</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      ) : null}
    </>
  );
}
