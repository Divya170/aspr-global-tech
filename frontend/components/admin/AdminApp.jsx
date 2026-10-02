'use client';
import { useCallback, useEffect, useState } from 'react';
import { admin } from '../../lib/api';
import ContentPanel from './ContentPanel';
import Dashboard from './Dashboard';
import SettingsPanel from './SettingsPanel';
import SubmissionsPanel from './SubmissionsPanel';
import SubscribersPanel from './SubscribersPanel';

const TABS = [['dashboard', 'Dashboard', 'dashboard'], ['enquiries', 'Enquiries', 'inbox'], ['applications', 'Applications', 'badge'],
  ['subscribers', 'Subscribers', 'mail'], ['content', 'Content', 'edit_note'], ['settings', 'Settings', 'tune']];
const KEY = 'aspr-admin-token';

export default function AdminApp() {
  const [token, setToken] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [toastMsg, setToastMsg] = useState(null);
  const [tick, setTick] = useState(0);
  const [newCount, setNewCount] = useState({});

  const toast = useCallback((text, bad = false) => { setToastMsg({ text, bad }); setTimeout(() => setToastMsg(null), 3200); }, []);
  const logout = useCallback(() => { try { sessionStorage.removeItem(KEY); } catch {} setToken(null); }, []);

  useEffect(() => {
    let t = null; try { t = sessionStorage.getItem(KEY); } catch {}
    if (!t) { setChecking(false); return; }
    admin.me(t).then(() => setToken(t)).catch(() => { try { sessionStorage.removeItem(KEY); } catch {} }).finally(() => setChecking(false));
    const h = window.location.hash.slice(1); if (TABS.some(([k]) => k === h)) setTab(h);
  }, []);
  useEffect(() => { if (token) window.history.replaceState(null, '', '#' + tab); }, [tab, token]);
  useEffect(() => {
    if (!token) return;
    admin.stats(token).then((s) => setNewCount({ enquiries: s.enquiries.byStatus.new || 0, applications: s.applications.byStatus.new || 0 }))
      .catch((e) => { if (e.status === 401) logout(); });
  }, [token, tick, logout]);

  if (checking) return <div className="ad"><div className="ad-login"><p style={{ color: '#5A6380' }}>Checking your session…</p></div></div>;
  if (!token) return <Login onToken={(t) => { try { sessionStorage.setItem(KEY, t); } catch {} setToken(t); }} />;

  const changed = () => setTick((n) => n + 1);
  const nav = TABS.map(([k, l, icon]) => (
    <button key={k} type="button" className={'ad-nav' + (tab === k ? ' on' : '')} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}>
      <span className="ms" aria-hidden="true">{icon}</span>{l}{newCount[k] ? <span className="ad-badge">{newCount[k]}</span> : null}
    </button>
  ));
  return (
    <div className="ad">
      <aside className="ad-side">
        <img src="/assets/aspr-logo-white.png" alt="ASPR Global Tech" />
        {nav}
        <span className="grow" />
        <a className="ad-nav" href="/" target="_blank" rel="noreferrer"><span className="ms" aria-hidden="true">open_in_new</span>View website</a>
        <button type="button" className="ad-nav" onClick={logout}><span className="ms" aria-hidden="true">logout</span>Sign out</button>
      </aside>
      <nav className="ad-mobile-nav" aria-label="Admin">{nav}<button type="button" className="ad-nav" onClick={logout}>Sign out</button></nav>
      <main className="ad-main">
        {tab === 'dashboard' ? <Dashboard token={token} go={setTab} tick={tick} /> : null}
        {tab === 'enquiries' || tab === 'applications' ? <SubmissionsPanel key={tab} kind={tab} token={token} toast={toast} onChanged={changed} /> : null}
        {tab === 'subscribers' ? <SubscribersPanel token={token} toast={toast} /> : null}
        {tab === 'content' ? <ContentPanel token={token} toast={toast} /> : null}
        {tab === 'settings' ? <SettingsPanel token={token} toast={toast} /> : null}
      </main>
      {toastMsg ? <div className={'ad-toast' + (toastMsg.bad ? ' bad' : '')} role="status">{toastMsg.text}</div> : null}
    </div>
  );
}

function Login({ onToken }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!password) return setError('Enter the admin password.');
    setBusy(true); setError('');
    try { const r = await admin.login(password); onToken(r.token); } catch (x) { setError(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="ad"><div className="ad-login">
      <form className="ad-card" onSubmit={submit} noValidate style={{ padding: 32 }}>
        <img src="/assets/aspr-logo.png" alt="ASPR Global Tech" style={{ height: 44, width: 'auto', display: 'block', marginBottom: 24 }} />
        <p className="ad-eyebrow">ADMIN</p>
        <h1 style={{ marginBottom: 20 }}>Sign in</h1>
        <div className="ad-field">
          <label htmlFor="pw">Password</label>
          <input id="pw" className={'ad-input' + (error ? ' bad' : '')} type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
          {error ? <p className="ad-err" role="alert">{error}</p> : null}
        </div>
        <button type="submit" className="ad-btn" style={{ width: '100%', justifyContent: 'center', height: 48 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
        <p className="ad-help" style={{ marginTop: 14 }}>Set the password with ADMIN_PASSWORD in backend/.env.</p>
      </form>
    </div></div>
  );
}
