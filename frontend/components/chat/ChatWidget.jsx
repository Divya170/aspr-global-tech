'use client';

// Site assistant. Mounted on the public pages (not /admin). Replies stream in token by token,
// are grounded in the site's own content, and a visitor who wants to start a project can leave
// their details without leaving the chat — those land in /admin as ordinary enquiries.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getChatConfig, getChatMessages, renderMarkdown, streamChat, submitChatLead } from '@/lib/chat';
import { COUNTRIES, findCountry, fullPhone, guessCountry, phoneError } from '@/lib/countries';
import { emailError } from '@/lib/rules';

const ROYAL = '#1A4AD8', INK = '#111F38', NAVY = '#16233F', MUTED = '#5A6380', LINE = '#E3E8F2', SOFT = '#F5F7FB';
const DEFAULT_GREETING = "Hi! 👋 I'm the ASPR assistant. Ask me about our services, prices, how we work — or tell me what you'd like to build.";
const SESSION_KEY = 'aspr.chat.sessionId';
const OPEN_KEY = 'aspr.chat.open';
const EMPTY_LEAD = { name: '', email: '', country: 'US', phone: '', need: '', brief: '' };

// Storage can throw outright in private modes, so every access is guarded.
const store = {
  get: (s, k) => { try { return window[s].getItem(k); } catch { return null; } },
  set: (s, k, v) => { try { v == null ? window[s].removeItem(k) : window[s].setItem(k, v); } catch { /* convenience only */ } },
};

const icon = (name, size = 22) => (
  <span aria-hidden="true" style={{ fontFamily: "'Material Symbols Rounded'", fontSize: `${size}px`, lineHeight: 1, fontVariationSettings: "'wght' 400" }}>{name}</span>
);

const field = { width: '100%', boxSizing: 'border-box', height: '42px', borderRadius: '10px', border: `1.5px solid ${LINE}`, background: '#fff', padding: '0 12px', fontFamily: 'inherit', fontSize: '14px', color: INK, outline: 'none' };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [starters, setStarters] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [messages, setMessages] = useState([{ role: 'assistant', content: DEFAULT_GREETING }]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [draft, setDraft] = useState('');
  const [showLead, setShowLead] = useState(false);
  const [lead, setLead] = useState(EMPTY_LEAD);
  const [leadErrs, setLeadErrs] = useState({});
  const [leadErr, setLeadErr] = useState('');
  const [leadSending, setLeadSending] = useState(false);
  const [leadRef, setLeadRef] = useState(null);
  const ctrl = useRef(null);
  const scroller = useRef(null);
  const input = useRef(null);

  // Config, then any stored conversation.
  useEffect(() => {
    let alive = true;
    setLead((l) => ({ ...l, country: guessCountry() }));
    if (store.get('sessionStorage', OPEN_KEY) === '1') setOpen(true);
    (async () => {
      const cfg = await getChatConfig();
      if (!alive) return;
      const g = cfg?.greeting || DEFAULT_GREETING;
      if (cfg) { setGreeting(g); setStarters(cfg.starters || []); setNeeds(cfg.needs || []); }
      setMessages((list) => (list.length === 1 && list[0].role === 'assistant' ? [{ role: 'assistant', content: g }] : list));
      const stored = store.get('localStorage', SESSION_KEY);
      if (!stored) return;
      setRestoring(true);
      const rows = await getChatMessages(stored);
      if (!alive) return;
      if (rows.length) {
        setSessionId(stored);
        setStarters([]);
        setMessages([{ role: 'assistant', content: g }, ...rows.map((r) => ({ role: r.role, content: r.content }))]);
      } else {
        store.set('localStorage', SESSION_KEY, null); // expired or never existed
      }
      setRestoring(false);
    })();
    return () => { alive = false; ctrl.current?.abort(); };
  }, []);

  useEffect(() => { store.set('sessionStorage', OPEN_KEY, open ? '1' : null); if (open) setTimeout(() => input.current?.focus(), 50); }, [open]);

  // Follow the transcript as it grows.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, showLead, open]);

  const remember = (id) => { setSessionId(id); store.set('localStorage', SESSION_KEY, id); };

  const patchLast = (fn) => setMessages((list) => {
    const next = [...list];
    const last = next[next.length - 1];
    if (last?.role === 'assistant') next[next.length - 1] = fn(last);
    return next;
  });

  const finishStreaming = () => patchLast((m) => (m.streaming ? { ...m, streaming: false, content: m.content || 'Stopped.' } : m));

  const send = useCallback(async (text) => {
    const question = text.trim();
    if (!question || loading) return;
    setShowLead(false);
    setStarters([]);
    setMessages((list) => [...list, { role: 'user', content: question }, { role: 'assistant', content: '', streaming: true }]);
    setLoading(true);
    ctrl.current = new AbortController();
    try {
      for await (const frame of streamChat(question, sessionId, window.location.pathname + window.location.hash, ctrl.current.signal)) {
        if (frame.type === 'start' || frame.type === 'done') remember(frame.sessionId);
        else if (frame.type === 'chunk') patchLast((m) => ({ ...m, content: m.content + frame.text }));
        else if (frame.type === 'lead') { if (!leadRef) setShowLead(true); }
        else if (frame.type === 'error') patchLast((m) => ({ ...m, content: frame.message, error: true, streaming: false }));
      }
    } catch {
      patchLast((m) => ({ ...m, content: "We couldn't reach the assistant. Please try again.", error: true, streaming: false }));
    } finally {
      ctrl.current = null;
      setLoading(false);
      finishStreaming();
    }
  }, [loading, sessionId, leadRef]);

  // Other parts of the page can open the assistant (and ask a question) with:
  // window.dispatchEvent(new CustomEvent('aspr:chat', { detail: { question } }))
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    const onAsk = (e) => {
      setOpen(true);
      const q = e.detail && e.detail.question;
      if (q) setTimeout(() => sendRef.current(q), 60);
    };
    window.addEventListener('aspr:chat', onAsk);
    return () => window.removeEventListener('aspr:chat', onAsk);
  }, []);

  const stop = () => { ctrl.current?.abort(); ctrl.current = null; setLoading(false); finishStreaming(); };

  const reset = () => {
    stop();
    setMessages([{ role: 'assistant', content: greeting }]);
    setSessionId(null);
    store.set('localStorage', SESSION_KEY, null);
    setShowLead(false); setLeadRef(null); setLeadErr(''); setLeadErrs({});
    getChatConfig().then((cfg) => cfg && setStarters(cfg.starters || []));
  };

  const submitLead = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!lead.name.trim()) errs.name = 'Enter your name.';
    const em = emailError(lead.email); if (em) errs.email = em;
    const pe = phoneError(lead.country, lead.phone); if (pe) errs.phone = pe;
    if (lead.brief.trim().length < 10) errs.message = 'Tell us a little about what you need.';
    setLeadErrs(errs);
    if (Object.keys(errs).length) return;
    setLeadSending(true); setLeadErr('');
    try {
      const res = await submitChatLead({
        name: lead.name.trim(), email: lead.email.trim(), phone: fullPhone(lead.country, lead.phone),
        need: lead.need || 'Not sure yet', brief: lead.brief.trim(), sessionId: sessionId || undefined,
      });
      setLeadRef(res.reference);
      setShowLead(false);
      setLead((l) => ({ ...EMPTY_LEAD, country: l.country }));
      setMessages((list) => [...list, { role: 'assistant', content: `Thanks, ${lead.name.trim().split(' ')[0]}! Your details are with the team. Your reference is **${res.reference}** — we reply within one working day.` }]);
    } catch (err) {
      setLeadErrs(err.fields || {});
      setLeadErr(err.message);
    } finally {
      setLeadSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const t = draft; setDraft(''); send(t); }
    if (e.key === 'Escape') setOpen(false);
  };

  const ctry = findCountry(lead.country);
  const setL = (k) => (e) => setLead((l) => ({ ...l, [k]: e.target.value }));
  const errText = (k) => leadErrs[k] ? <p style={{ margin: '4px 0 0', color: '#B42318', fontSize: '12px', fontWeight: 600 }}>{leadErrs[k]}</p> : null;

  return (
    <>
      <button type="button" className="aspr-chat-launcher" onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close the assistant' : 'Chat with the ASPR assistant'} aria-expanded={open}
        style={{ position: 'fixed', right: '24px', zIndex: 80, width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: open ? NAVY : ROYAL, color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 10px 28px rgba(26,74,216,0.35)', transition: 'background 180ms ease-out, transform 180ms ease-out' }}>
        {icon(open ? 'close' : 'forum', 26)}
        {!open && <span aria-hidden="true" style={{ position: 'absolute', top: '6px', right: '6px', width: '12px', height: '12px', borderRadius: '50%', background: '#25D366', border: '2px solid #fff' }} />}
      </button>

      {open && (
        <section role="dialog" aria-label="ASPR Global Tech assistant" className="aspr-chat-panel"
          style={{ position: 'fixed', zIndex: 80, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '20px', overflow: 'hidden',
            border: `1px solid ${LINE}`, boxShadow: '0 24px 60px rgba(17,31,56,0.22)', fontFamily: 'inherit', color: INK }}>

          <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', background: `linear-gradient(120deg, #1E4CCE 0%, ${NAVY} 80%)`, color: '#fff' }}>
            <span style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center' }}>{icon('smart_toy', 22)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '15.5px' }}>ASPR Assistant</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#DBE8FA' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#25D366' }} />Online · replies instantly
              </div>
            </div>
            <button type="button" onClick={reset} title="Start a new conversation" aria-label="Start a new conversation"
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '10px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>{icon('refresh', 19)}</button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close the assistant"
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '10px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>{icon('close', 19)}</button>
          </header>

          <div ref={scroller} aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '12px', background: SOFT }}>
            {restoring && <div style={{ fontSize: '12px', color: MUTED }}>Restoring your conversation…</div>}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
                <div className={m.role === 'user' ? undefined : 'aspr-chat-md'}
                  style={{ padding: '10px 14px', fontSize: '14.5px', lineHeight: 1.55, wordBreak: 'break-word',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.role === 'user' ? ROYAL : m.error ? '#FDECEA' : '#fff',
                    color: m.role === 'user' ? '#fff' : m.error ? '#B42318' : INK,
                    border: m.role === 'user' ? 'none' : `1px solid ${LINE}` }}>
                  {m.role === 'user'
                    ? <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                    : m.streaming && !m.content
                      ? <span className="aspr-chat-dots" aria-label="Typing"><i /><i /><i /></span>
                      : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />}
                  {m.streaming && m.content ? <span style={{ color: ROYAL }}>▍</span> : null}
                </div>
              </div>
            ))}

            {starters.length > 0 && !loading && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {starters.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="aspr-chat-chip"
                    style={{ padding: '8px 12px', borderRadius: '999px', background: '#fff', border: `1.5px solid ${LINE}`, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, color: INK, textAlign: 'left' }}>{s}</button>
                ))}
              </div>
            )}

            {!showLead && !leadRef && !loading && messages.length > 2 && (
              <button type="button" onClick={() => setShowLead(true)}
                style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: '999px', background: '#EAF0FD', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, color: ROYAL }}>
                Talk to the team →
              </button>
            )}

            {showLead && (
              <form onSubmit={submitLead} noValidate style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '12px', letterSpacing: '0.16em', color: ROYAL }}>START A PROJECT</p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: MUTED }}>Leave your details — we reply within one working day.</p>
                </div>
                <div>
                  <input aria-label="Your name" placeholder="Your name" autoComplete="name" value={lead.name} onChange={setL('name')} style={{ ...field, borderColor: leadErrs.name ? '#B42318' : LINE }} />
                  {errText('name')}
                </div>
                <div>
                  <input aria-label="Email" type="email" placeholder="you@company.com" autoComplete="email" value={lead.email} onChange={setL('email')} style={{ ...field, borderColor: leadErrs.email ? '#B42318' : LINE }} />
                  {errText('email')}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div className="cc-pick" style={{ position: 'relative', flex: '0 0 auto' }}>
                      <div aria-hidden="true" style={{ ...field, width: 'auto', display: 'flex', alignItems: 'center', gap: '5px', padding: '0 24px 0 10px', fontWeight: 600, borderColor: leadErrs.phone ? '#B42318' : LINE }}>
                        <span style={{ fontSize: '18px', lineHeight: 1 }}>{ctry.flag}</span><span>+{ctry.dial}</span>
                        <span style={{ position: 'absolute', right: '9px', fontSize: '9px', color: MUTED }}>▼</span>
                      </div>
                      <select aria-label="Country" value={lead.country} onChange={setL('country')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: '16px' }}>
                        {COUNTRIES.map((c) => <option key={c.iso} value={c.iso}>{`${c.flag}  ${c.name} (+${c.dial})`}</option>)}
                      </select>
                    </div>
                    <input aria-label="Phone or WhatsApp" type="tel" autoComplete="tel-national" placeholder={ctry.example} value={lead.phone} onChange={setL('phone')}
                      style={{ ...field, flex: '1 1 auto', minWidth: 0, borderColor: leadErrs.phone ? '#B42318' : LINE }} />
                  </div>
                  {errText('phone')}
                </div>
                <select aria-label="What do you need?" value={lead.need} onChange={setL('need')} style={{ ...field, color: lead.need ? INK : MUTED }}>
                  <option value="">What do you need?</option>
                  {needs.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {errText('needs')}
                <div>
                  <textarea aria-label="Tell us about your project" rows={3} placeholder="What would you like to build?" value={lead.brief} onChange={setL('brief')}
                    style={{ ...field, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.45, borderColor: leadErrs.message ? '#B42318' : LINE }} />
                  {errText('message')}
                </div>
                {leadErr && !Object.keys(leadErrs).length ? <p role="alert" style={{ margin: 0, color: '#B42318', fontSize: '13px', fontWeight: 600 }}>{leadErr}</p> : null}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={leadSending}
                    style={{ flex: 1, height: '44px', borderRadius: '12px', border: 'none', background: ROYAL, color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: '14px', cursor: leadSending ? 'default' : 'pointer', opacity: leadSending ? 0.7 : 1 }}>
                    {leadSending ? 'Sending…' : 'Send to the team →'}
                  </button>
                  <button type="button" onClick={() => setShowLead(false)}
                    style={{ height: '44px', padding: '0 14px', borderRadius: '12px', border: `1.5px solid ${LINE}`, background: '#fff', fontFamily: 'inherit', fontWeight: 600, fontSize: '13px', color: MUTED, cursor: 'pointer' }}>Not now</button>
                </div>
              </form>
            )}
          </div>

          <div style={{ borderTop: `1px solid ${LINE}`, padding: '12px', background: '#fff' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <textarea ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} rows={1} maxLength={1000}
                disabled={loading} placeholder="Ask about services, prices, timelines…" aria-label="Your question"
                style={{ flex: 1, resize: 'none', padding: '11px 14px', borderRadius: '12px', border: `1.5px solid ${LINE}`, fontFamily: 'inherit', fontSize: '14.5px', lineHeight: 1.4, maxHeight: '110px', color: INK, outline: 'none', background: loading ? SOFT : '#fff' }} />
              {loading
                ? <button type="button" onClick={stop} aria-label="Stop the answer"
                    style={{ width: '44px', height: '44px', borderRadius: '12px', border: `1.5px solid ${LINE}`, background: '#fff', color: INK, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>{icon('stop', 22)}</button>
                : <button type="button" onClick={() => { const t = draft; setDraft(''); send(t); }} disabled={!draft.trim()} aria-label="Send"
                    style={{ width: '44px', height: '44px', borderRadius: '12px', border: 'none', background: draft.trim() ? ROYAL : '#C9D3E6', color: '#fff', cursor: draft.trim() ? 'pointer' : 'default', display: 'grid', placeItems: 'center' }}>{icon('send', 20)}</button>}
            </div>
            <p style={{ margin: '8px 2px 0', fontSize: '11px', color: MUTED, lineHeight: 1.4 }}>
              AI answers from our site content and may be incomplete. For an exact quote, <a href="/company#contact" style={{ color: ROYAL, fontWeight: 600 }}>send a brief</a>.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
