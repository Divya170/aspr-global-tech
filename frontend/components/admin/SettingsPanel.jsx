'use client';
import { useEffect, useState } from 'react';
import { admin } from '../../lib/api';
import { ErrorBox, Loading } from './ui';
import { useResource } from './useResource';

const HELP = {
  company: 'Name, contact email, phone, WhatsApp link, address and hours used across the site.',
  stats: 'Numbers counted up in the home page stats band.',
  heroStrip: 'Images in the drifting hero strip (src + alt).',
  budgets: 'Budget options in both brief forms.', timelines: 'Launch timeline options.', contactMethods: 'How clients can ask to be contacted.',
  processGroups: 'Stage names, verbs and summaries for the process sections.',
  showTestimonials: 'true / false — show the testimonial block on the Work page.',
};

export default function SettingsPanel({ token, toast }) {
  const res = useResource(() => admin.settings(token), [token]);
  const [key, setKey] = useState('company');
  const [text, setText] = useState('');
  const [bad, setBad] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (res.data && res.data[key] !== undefined) { setText(JSON.stringify(res.data[key], null, 2)); setBad(''); } }, [res.data, key]);
  if (res.error) return <ErrorBox error={res.error} retry={res.reload} />;
  if (!res.data) return <Loading />;
  const save = async () => {
    let value;
    try { value = JSON.parse(text); } catch (e) { setBad('That isn\'t valid JSON: ' + e.message); return; }
    setSaving(true);
    try { await admin.saveSetting(token, key, value); toast('Setting saved — live on the website'); res.reload(); } catch (e) { toast(e.message, true); } finally { setSaving(false); }
  };
  return (
    <>
      <div className="ad-top">
        <div><p className="ad-eyebrow">SITE SETTINGS</p><h1>Settings</h1></div>
        <select className="ad-select" value={key} onChange={(e) => setKey(e.target.value)} aria-label="Setting">
          {Object.keys(res.data).sort().map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <div className="ad-card">
        <p className="ad-help" style={{ marginTop: 0, marginBottom: 12 }}>{HELP[key] || 'Structured content used by the website.'}</p>
        <textarea className={'ad-textarea' + (bad ? ' bad' : '')} rows={20} spellCheck={false} style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13 }}
          value={text} onChange={(e) => { setText(e.target.value); setBad(''); }} aria-label={`Value of ${key}`} />
        {bad ? <p className="ad-err">{bad}</p> : null}
        <div className="ad-row-actions">
          <button type="button" className="ad-btn ghost" onClick={() => { setText(JSON.stringify(res.data[key], null, 2)); setBad(''); }}>Discard changes</button>
          <button type="button" className="ad-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save setting'}</button>
        </div>
      </div>
    </>
  );
}
