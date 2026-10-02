'use client';

// Careers: "Open roles" — role cards that expand into the role details and an application
// form (country-aware phone, any number of work links, file uploads).

import { useEffect, useRef, useState } from 'react';
import { submitApplication } from '@/lib/api';
import { COUNTRIES, findCountry, fullPhone, guessCountry, phoneError } from '@/lib/countries';
import { emailError, fileError } from '@/lib/rules';

const MAX_LINKS = 6;
const ROLE_ICON = [[/full stack|developer|engineer/i, 'code'], [/app/i, 'smartphone'], [/graphic|design/i, 'palette'], [/video/i, 'movie'], [/intern/i, 'school']];
const roleIcon = (t) => (ROLE_ICON.find(([re]) => re.test(t)) || [null, 'work'])[1];

/** Recognise common profile sites so each link gets a fitting label. */
const SITES = [
  [/github\.com/i, 'GitHub', 'code'], [/gitlab\.com/i, 'GitLab', 'code'], [/linkedin\.com/i, 'LinkedIn', 'badge'], [/behance\.net/i, 'Behance', 'palette'],
  [/dribbble\.com/i, 'Dribbble', 'palette'], [/(youtube\.com|youtu\.be|vimeo\.com)/i, 'Video', 'play_circle'], [/figma\.com/i, 'Figma', 'draw'],
  [/(play\.google\.com|apps\.apple\.com)/i, 'App store', 'smartphone'],
];
const siteOf = (url) => { const m = SITES.find(([re]) => re.test(url)); return m ? { label: m[1], icon: m[2] } : { label: url ? 'Website' : 'Link', icon: 'link' }; };
const URL_RE = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i;

const PERKS = [
  ['construction', 'Real client work', 'Ship projects for clients in the US and worldwide from your first month.'],
  ['school', 'Skill over certificates', 'Your portfolio is your degree here.'],
  ['auto_awesome', 'Modern tools, AI included', 'Work with the stack and tools the industry is moving to.'],
  ['description', 'Offers in writing', 'Clear role, pay and start date. No surprises.'],
];

/** Splits a role description into its intro and the "What you'll do / What we look for" blocks. */
function parseDesc(desc = '') {
  const parts = desc.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const blocks = parts.map((p) => {
    const m = p.match(/^(What you'll do|What we look for):\s*([\s\S]*)$/i);
    return m ? { h: m[1], items: m[2].split(/;\s*/).map((x) => x.replace(/\.$/, '').trim()).filter(Boolean) } : { text: p };
  });
  return { intro: blocks.filter((b) => b.text).map((b) => b.text), lists: blocks.filter((b) => b.h) };
}

const EMPTY = { name: '', email: '', country: 'US', phone: '', links: [''], message: '', files: [] };

function ApplyForm({ role, onDone }) {
  const [f, setF] = useState(() => ({ ...EMPTY }));
  const [errs, setErrs] = useState({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { setF((x) => ({ ...x, country: guessCountry() })); }, []);

  const validate = (x) => {
    const e = {};
    if (!x.name.trim()) e.name = 'Enter your name.';
    const em = emailError(x.email, 'That email looks incomplete.'); if (em) e.email = em;
    const pe = phoneError(x.country, x.phone); if (pe) e.phone = pe;
    const links = x.links.map((l) => l.trim()).filter(Boolean);
    if (!links.length && !x.files.length) e.portfolio = 'Send work, not a template CV — add a link or attach files.';
    else if (links.some((l) => !URL_RE.test(l))) e.portfolio = "One of the links doesn't look right — paste the full URL.";
    const fe = fileError(x.files); if (fe) e.files = fe;
    return e;
  };
  const set = (k) => (ev) => { const v = ev.target.value; setF((x) => { const n = { ...x, [k]: v }; if (tried) setErrs(validate(n)); return n; }); };
  const setLink = (i, v) => setF((x) => { const links = x.links.map((l, j) => (j === i ? v : l)); const n = { ...x, links }; if (tried) setErrs(validate(n)); return n; });
  const addLink = () => setF((x) => (x.links.length >= MAX_LINKS ? x : { ...x, links: [...x.links, ''] }));
  const removeLink = (i) => setF((x) => ({ ...x, links: x.links.length > 1 ? x.links.filter((_, j) => j !== i) : [''] }));
  const addFiles = (ev) => { const picked = [...(ev.target.files || [])]; ev.target.value = ''; setF((x) => { const n = { ...x, files: [...x.files, ...picked] }; if (tried || fileError(n.files)) { setTried(true); setErrs(validate(n)); } return n; }); };
  const removeFile = (i) => setF((x) => ({ ...x, files: x.files.filter((_, j) => j !== i) }));

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const e = validate(f);
    setTried(true); setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true); setErr('');
    try {
      const links = f.links.map((l) => l.trim()).filter(Boolean);
      const res = await submitApplication(role.id, { name: f.name.trim(), email: f.email.trim(), phone: fullPhone(f.country, f.phone), links, portfolio: links.join('\n'), message: f.message.trim() }, f.files);
      onDone(res.refNo);
    } catch (x) {
      if (x.fieldErrors) setErrs(x.fieldErrors); else setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const ctry = findCountry(f.country);
  const e = (k) => (errs[k] ? <p className="cr-err">{errs[k]}</p> : null);

  return (
    <form className="cr-form" onSubmit={submit} noValidate>
      <div className="cr-form-head">
        <span aria-hidden="true">send</span>
        <div><p>Apply for</p><strong>{role.title}</strong></div>
      </div>

      <fieldset className="cr-group">
        <legend><b aria-hidden="true">person</b>About you</legend>
        <div className="cr-row">
          <label className="cr-field">
            <span>Your name <i>*</i></span>
            <input type="text" autoComplete="name" value={f.name} onChange={set('name')} placeholder="Full name" aria-invalid={!!errs.name} />
            {e('name')}
          </label>
          <label className="cr-field">
            <span>Email <i>*</i></span>
            <input type="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="you@example.com" aria-invalid={!!errs.email} />
            {e('email')}
          </label>
        </div>
        <div className="cr-field">
          <span>Phone / WhatsApp <i>*</i></span>
          <div className="cr-phone">
            <div className="cc-pick cr-cc">
              <div aria-hidden="true" className={errs.phone ? 'is-bad' : ''}><em>{ctry.flag}</em>+{ctry.dial}<small>▼</small></div>
              <select aria-label="Country" value={f.country} onChange={set('country')}>
                {COUNTRIES.map((c) => <option key={c.iso} value={c.iso}>{`${c.flag}  ${c.name} (+${c.dial})`}</option>)}
              </select>
            </div>
            <input type="tel" autoComplete="tel-national" value={f.phone} onChange={set('phone')} placeholder={ctry.example} aria-label="Phone number" aria-invalid={!!errs.phone} />
          </div>
          {e('phone')}
        </div>
      </fieldset>

      <fieldset className="cr-group">
        <legend><b aria-hidden="true">link</b>Your work <small>Portfolio, GitHub, LinkedIn, Behance, YouTube…</small></legend>
        <div className="cr-links">
          {f.links.map((l, i) => {
            const site = siteOf(l);
            return (
              <div key={i} className="cr-link">
                <span className="cr-link-icon" aria-hidden="true">{site.icon}</span>
                <input type="url" value={l} onChange={(ev) => setLink(i, ev.target.value)} placeholder={i === 0 ? 'https://github.com/you' : 'https://…'} aria-label={`Link ${i + 1}`} aria-invalid={!!errs.portfolio} />
                {l.trim() ? <span className="cr-link-tag">{site.label}</span> : null}
                <button type="button" className="cr-link-x" onClick={() => removeLink(i)} aria-label={`Remove link ${i + 1}`}>✕</button>
              </div>
            );
          })}
        </div>
        {f.links.length < MAX_LINKS ? (
          <button type="button" className="cr-add" onClick={addLink}><b aria-hidden="true">add</b>Add another link</button>
        ) : <p className="cr-hint">Up to {MAX_LINKS} links.</p>}
        {e('portfolio')}

        <div className="cr-drop" onClick={() => fileRef.current && fileRef.current.click()} role="button" tabIndex={0}
          onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fileRef.current && fileRef.current.click(); } }}>
          <span aria-hidden="true">upload_file</span>
          <div><strong>Attach work samples</strong><small>PDF, images or docs · up to 10 MB each · CV optional</small></div>
          <input ref={fileRef} type="file" multiple onChange={addFiles} hidden />
        </div>
        {f.files.length ? (
          <div className="cr-files">
            {f.files.map((file, i) => <span key={i}>{file.name}<button type="button" onClick={() => removeFile(i)} aria-label={`Remove ${file.name}`}>✕</button></span>)}
          </div>
        ) : null}
        {e('files')}
      </fieldset>

      <fieldset className="cr-group">
        <legend><b aria-hidden="true">chat</b>Anything else? <small>Optional</small></legend>
        <textarea rows={3} value={f.message} onChange={set('message')} placeholder="What you built, what you learned on your own, what you want to do next." />
      </fieldset>

      {err ? <div role="alert" className="cr-alert"><strong>We couldn&apos;t send your application.</strong><span>{err}</span></div> : null}

      <div className="cr-submit">
        <span><b aria-hidden="true">task_alt</b>Shortlisted? Next is a short task.</span>
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send application →'}</button>
      </div>
    </form>
  );
}

export default function CareersRoles({ roles = [], careersEmail = 'careers@asprglobaltech.com' }) {
  const [open, setOpen] = useState(-1);
  const [sent, setSent] = useState({});
  const list = roles.filter((r) => r.isOpen !== false);

  return (
    <section className="cr" id="open-roles">
      <div className="cr-in">
        <aside className="cr-side">
          <p className="cr-eyebrow">OPEN ROLES</p>
          <h2 className="cr-h2">{list.length === 5 ? 'Five' : list.length} ways <span>in.</span></h2>
          <p className="cr-sub">Pick a role to see the details and apply in two minutes. Prefer email? <a href={`mailto:${careersEmail}`}>{careersEmail}</a></p>
          <ul className="cr-perks">
            {PERKS.map(([ic, t, d]) => <li key={t}><b aria-hidden="true">{ic}</b><span><strong>{t}</strong>{d}</span></li>)}
          </ul>
        </aside>

        <div className="cr-list">
          {list.map((r, i) => {
            const on = open === i;
            const { intro, lists } = parseDesc(r.description);
            return (
              <article key={r.id || r.title} className={`cr-role${on ? ' is-open' : ''}`} style={{ '--i': i }}>
                <button type="button" className="cr-role-head" aria-expanded={on} onClick={() => setOpen(on ? -1 : i)}>
                  <span className="cr-role-icon" aria-hidden="true">{roleIcon(r.title)}</span>
                  <span className="cr-role-main">
                    <span className="cr-role-title">{r.title}</span>
                    <span className="cr-role-meta">{(r.meta || []).map((m) => <em key={m}>{m}</em>)}</span>
                    {!on && intro[0] ? <span className="cr-role-teaser">{intro[0]}</span> : null}
                  </span>
                  <span className="cr-role-cta">{on ? 'Close' : 'View & apply'}<b aria-hidden="true">{on ? 'expand_less' : 'arrow_forward'}</b></span>
                </button>
                {on ? (
                  <div className="cr-role-body">
                    {sent[i] ? (
                      <div className="cr-done">
                        <span aria-hidden="true">check</span>
                        <div>
                          <strong>Application received.</strong>
                          <p>We look at the work first and reply within one working day. Reference <b>{sent[i]}</b>.</p>
                          <div className="cr-done-ctas">
                            <a href="#process">See how we work →</a>
                            <button type="button" onClick={() => setOpen(-1)}>Apply for another role</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="cr-detail">
                        <div className="cr-desc">
                          {intro.map((p) => <p key={p}>{p}</p>)}
                          {lists.map((l) => (
                            <div key={l.h} className="cr-desc-block">
                              <p className="cr-desc-h"><b aria-hidden="true">{/do/i.test(l.h) ? 'bolt' : 'star'}</b>{l.h}</p>
                              <ul>{l.items.map((x) => <li key={x}>{x}</li>)}</ul>
                            </div>
                          ))}
                        </div>
                        <ApplyForm role={r} onDone={(ref) => setSent((m) => ({ ...m, [i]: ref }))} />
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
