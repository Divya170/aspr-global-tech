'use client';
import { useEffect, useState } from 'react';
import { admin } from '../../lib/api';
import { Drawer, Empty, ErrorBox, Loading, Pager, useDebounced } from './ui';
import { useResource } from './useResource';

const BLOCK_TYPES = [['standfirst', 'Standfirst'], ['p', 'Paragraph'], ['h2', 'Subheading'], ['quote', 'Pull quote'],
  ['takeaways', 'Key takeaways (one per line)'], ['list', 'Bullet list (one per line)'], ['checklist', 'Checklist (one per line)'], ['callout', 'Tip / callout']];

export default function ContentPanel({ token, toast }) {
  const schema = useResource(() => admin.schema(token), [token]);
  const [name, setName] = useState('services');
  if (schema.error) return <ErrorBox error={schema.error} retry={schema.reload} />;
  if (!schema.data) return <Loading />;
  const def = schema.data.find((c) => c.name === name) || schema.data[0];
  return (
    <>
      <div className="ad-top">
        <div><p className="ad-eyebrow">WEBSITE CONTENT</p><h1>{def.label}</h1></div>
        <select className="ad-select" value={def.name} onChange={(e) => setName(e.target.value)} aria-label="Collection">
          {schema.data.map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
        </select>
      </div>
      <Collection key={def.name} def={def} token={token} toast={toast} />
    </>
  );
}

function Collection({ def, token, toast }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // item | 'new'
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq]);
  const list = useResource(() => admin.list(token, `content/${def.name}`, { q: dq, page, pageSize: 50 }), [token, def.name, dq, page]);
  const data = list.data;
  const refField = def.fields.find((f) => f.type === 'ref');
  const refs = useResource(() => (refField ? admin.list(token, `content/${refField.ref.collection}`, { pageSize: 200 }) : Promise.resolve({ items: [] })), [token, def.name]);
  const refItems = refs.data ? refs.data.items : [];
  const secondary = def.fields.find((f) => ['select', 'ref'].includes(f.type) && f.key !== def.titleKey);

  const toggle = async (item) => {
    try { await admin.update(token, `content/${def.name}`, item.id, { active: !item.active }); toast(item.active ? 'Hidden from the website' : 'Published'); list.reload(); }
    catch (e) { toast(e.message, true); }
  };
  const move = async (item, dir) => {
    try { await admin.update(token, `content/${def.name}`, item.id, { sort: Math.max(0, (item.sort || 0) + dir) }); list.reload(); } catch (e) { toast(e.message, true); }
  };
  return (
    <>
      <div className="ad-bar">
        <input className="ad-input ad-search" type="search" placeholder={`Search ${def.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <button type="button" className="ad-btn" onClick={() => setEditing('new')}><span className="ms">add</span>New item</button>
      </div>
      <ErrorBox error={list.error} retry={list.reload} />
      {list.loading && !data ? <Loading /> : data && !data.items.length ? (
        <div className="ad-card"><Empty title={dq ? 'Nothing matches that search.' : 'Nothing here yet.'} body={dq ? 'Try another word.' : 'Add the first item to show it on the website.'} /></div>
      ) : data ? (
        <>
          <div className="ad-table-wrap" style={{ opacity: list.loading ? 0.6 : 1 }}>
            <table className="ad-table">
              <thead><tr><th>ORDER</th><th>{def.fields.find((f) => f.key === def.titleKey).label.toUpperCase()}</th>{secondary ? <th>{secondary.label.toUpperCase()}</th> : null}<th>STATUS</th><th /></tr></thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} onClick={() => setEditing(it)}>
                    <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="ad-mini" aria-label="Move up" onClick={() => move(it, -1)}>↑</button>{' '}
                      <span className="sub">{it.sort}</span>{' '}
                      <button type="button" className="ad-mini" aria-label="Move down" onClick={() => move(it, 1)}>↓</button>
                    </td>
                    <td><b>{String(it[def.titleKey] ?? '')}</b></td>
                    {secondary ? <td>{secondary.type === 'ref' ? (refItems.find((r) => r.id === it[secondary.key]) || {}).title || it[secondary.key] : String(it[secondary.key])}</td> : null}
                    <td><span className={'ad-pill ' + (it.active ? 'active' : 'off')}>{it.active ? 'Published' : 'Hidden'}</span></td>
                    <td onClick={(e) => e.stopPropagation()}><button type="button" className="ad-mini" onClick={() => toggle(it)}>{it.active ? 'Hide' : 'Publish'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={data.page} pages={Math.max(1, Math.ceil(data.total / data.pageSize))} total={data.total} onPage={setPage} />
        </>
      ) : null}
      {editing ? <Editor def={def} item={editing === 'new' ? null : editing} refItems={refItems} token={token} toast={toast}
        onClose={() => setEditing(null)} onSaved={() => { list.reload(); setEditing(null); }} /> : null}
    </>
  );
}

function emptyValue(f) {
  if (f.type === 'boolean') return f.key === 'active';
  if (f.type === 'list' || f.type === 'blocks') return [];
  if (f.type === 'select') return f.options[0];
  return '';
}

function Editor({ def, item, refItems, token, toast, onClose, onSaved }) {
  const [form, setForm] = useState(() => Object.fromEntries(def.fields.map((f) => [f.key, item ? item[f.key] ?? emptyValue(f) : emptyValue(f)])));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => { setForm((x) => ({ ...x, [k]: v })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const validate = () => {
    const e = {};
    for (const f of def.fields) {
      const v = form[f.key];
      if (f.required && (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length))) e[f.key] = `${f.label} is required.`;
      if (f.pattern && v && !new RegExp(f.pattern).test(v)) e[f.key] = `${f.label} may only contain ${f.patternHint}.`;
      if (f.max && typeof v === 'string' && v.length > f.max) e[f.key] = `${f.label} must be ${f.max} characters or fewer.`;
    }
    return e;
  };
  const save = async (ev) => {
    ev.preventDefault();
    const e = validate(); setErrors(e); if (Object.keys(e).length) return;
    const body = { ...form };
    if (item === null && body.sort === '') delete body.sort;
    setSaving(true); setErr(null);
    try {
      if (item) await admin.update(token, `content/${def.name}`, item.id, body); else await admin.create(token, `content/${def.name}`, body);
      toast(item ? 'Saved — live on the website' : 'Created — live on the website'); onSaved();
    } catch (x) { if (x.fieldErrors) setErrors(x.fieldErrors); else setErr(x); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${item[def.titleKey]}"? This can't be undone.`)) return;
    try { await admin.remove(token, `content/${def.name}`, item.id); toast('Deleted'); onSaved(); } catch (x) { toast(x.message, true); }
  };

  return (
    <Drawer eyebrow={def.label.toUpperCase()} title={item ? String(item[def.titleKey]) : `New ${def.label.replace(/s$/, '').toLowerCase()}`} onClose={onClose}>
      <form onSubmit={save} noValidate>
        <ErrorBox error={err} />
        {def.fields.map((f) => <Field key={f.key} f={f} value={form[f.key]} error={errors[f.key]} onChange={(v) => set(f.key, v)} refItems={refItems} />)}
        <div className="ad-row-actions">
          {item ? <button type="button" className="ad-btn danger" onClick={remove}><span className="ms">delete</span>Delete</button> : <span />}
          <button type="submit" className="ad-btn" disabled={saving}>{saving ? 'Saving…' : item ? 'Save changes' : 'Create'}</button>
        </div>
      </form>
    </Drawer>
  );
}

function Field({ f, value, error, onChange, refItems }) {
  const id = 'f-' + f.key, bad = error ? ' bad' : '';
  let input;
  switch (f.type) {
    case 'textarea':
      input = <textarea id={id} className={'ad-textarea' + bad} rows={4} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />; break;
    case 'number':
      input = <input id={id} className={'ad-input' + bad} type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />; break;
    case 'boolean':
      return <div className="ad-field"><label className="ad-check"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />{f.label}</label>{f.help ? <p className="ad-help">{f.help}</p> : null}</div>;
    case 'select':
      input = <select id={id} className={'ad-select' + bad} value={value} onChange={(e) => onChange(typeof f.options[0] === 'number' ? Number(e.target.value) : e.target.value)}>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>; break;
    case 'ref':
      input = <select id={id} className={'ad-select' + bad} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}><option value="">Choose…</option>{refItems.map((r) => <option key={r.id} value={r.id}>{r[f.ref.labelKey]}</option>)}</select>; break;
    case 'list':
      input = <textarea id={id} className={'ad-textarea' + bad} rows={4} value={(value || []).join('\n')} onChange={(e) => onChange(e.target.value.split('\n'))} onBlur={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />; break;
    case 'blocks':
      input = <Blocks value={value || []} onChange={onChange} />; break;
    case 'image':
      input = (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input id={id} className={'ad-input' + bad} style={{ flex: 1 }} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="/assets/…" />
          {value ? <img src={value} alt="" style={{ width: 64, height: 42, objectFit: 'cover', borderRadius: 8, border: '1px solid #E3E8F2' }} /> : null}
        </div>
      ); break;
    default:
      input = <input id={id} className={'ad-input' + bad} value={value ?? ''} onChange={(e) => onChange(e.target.value)} maxLength={f.max || undefined} />;
  }
  return (
    <div className="ad-field">
      <label htmlFor={id}>{f.label}{f.required ? <span style={{ color: '#B42318' }}> *</span> : null}</label>
      {input}
      {error ? <p className="ad-err">{error}</p> : f.help ? <p className="ad-help">{f.help}</p> : null}
    </div>
  );
}

function Blocks({ value, onChange }) {
  const upd = (i, patch) => onChange(value.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const move = (i, d) => { const n = [...value]; const [b] = n.splice(i, 1); n.splice(Math.max(0, Math.min(n.length, i + d)), 0, b); onChange(n); };
  return (
    <div>
      {value.map((b, i) => (
        <div key={i} className="ad-block">
          <div className="ad-block-top">
            <select className="ad-select" value={b.type} onChange={(e) => upd(i, { type: e.target.value })} aria-label="Block type">{BLOCK_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <span style={{ flex: 1 }} />
            <button type="button" className="ad-mini" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button type="button" className="ad-mini" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button type="button" className="ad-mini" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove block">✕</button>
          </div>
          <textarea className="ad-textarea" rows={b.type === 'h2' ? 1 : 3} value={b.text} onChange={(e) => upd(i, { text: e.target.value })} />
        </div>
      ))}
      <button type="button" className="ad-btn ghost" onClick={() => onChange([...value, { type: 'p', text: '' }])}><span className="ms">add</span>Add block</button>
    </div>
  );
}
