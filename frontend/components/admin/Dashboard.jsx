'use client';
import { admin } from '../../lib/api';
import { Empty, ErrorBox, fmtDate, label, Loading, Pill } from './ui';
import { useResource } from './useResource';

export default function Dashboard({ token, go, tick }) {
  const s = useResource(() => admin.stats(token), [token, tick]);
  if (s.error) return <ErrorBox error={s.error} retry={s.reload} />;
  if (!s.data) return <Loading />;
  const d = s.data;
  const kpis = [
    ['New enquiries', d.enquiries.byStatus.new || 0, 'enquiries'], ['Enquiries · last 7 days', d.enquiries.last7Days, 'enquiries'],
    ['New applications', d.applications.byStatus.new || 0, 'applications'], ['Active subscribers', d.subscribers.active, 'subscribers'],
  ];
  return (
    <>
      <div className="ad-top"><div><p className="ad-eyebrow">OVERVIEW</p><h1>Dashboard</h1></div>
        <button type="button" className="ad-btn ghost" onClick={s.reload}><span className="ms">refresh</span>Refresh</button></div>
      <div className="ad-grid">
        {kpis.map(([k, v, tab]) => (
          <button key={k} type="button" className="ad-card ad-kpi" onClick={() => go(tab)} style={{ textAlign: 'left', cursor: 'pointer' }}><b>{v}</b><span>{k}</span></button>
        ))}
      </div>
      <div className="ad-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <div className="ad-card">
          <h2>Latest activity</h2>
          {d.recent.length ? d.recent.map((r) => (
            <div key={r.kind + r.id} className="ad-file" style={{ cursor: 'pointer' }} onClick={() => go(r.kind === 'enquiry' ? 'enquiries' : 'applications')}>
              <span><b>{r.name}</b> <span style={{ color: '#5A6380' }}>· {r.kind === 'enquiry' ? 'Brief' : 'Application'} · {r.refNo}</span><br /><span style={{ color: '#5A6380', fontSize: 13 }}>{fmtDate(r.createdAt)}</span></span>
              <Pill value={r.status} />
            </div>
          )) : <Empty title="No submissions yet." body="Briefs and applications from the website land here." />}
        </div>
        <div className="ad-card">
          <h2>Pipeline</h2>
          {Object.entries(d.enquiries.byStatus).length ? Object.entries(d.enquiries.byStatus).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E3E8F2' }}><span>{label(k)}</span><b>{v}</b></div>
          )) : <p className="ad-help">No enquiries yet.</p>}
          <h2 style={{ marginTop: 22 }}>Most requested</h2>
          {d.enquiries.topNeeds.length ? <div className="ad-chips">{d.enquiries.topNeeds.map((n) => <span key={n.need} className="ad-pill">{n.need} · {n.n}</span>)}</div> : <p className="ad-help">Appears once briefs arrive.</p>}
        </div>
      </div>
    </>
  );
}
