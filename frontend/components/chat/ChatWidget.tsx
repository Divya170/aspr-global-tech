'use client';

// Site assistant. Mounted on the public pages (not /admin). Replies stream in token by token,
// are grounded in the site's own content, and a visitor who wants to start a project can leave
// their details without leaving the chat. Those land in /admin as ordinary leads.

import { ArrowUp, MessageCircle, RotateCcw, Sparkles, Square, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { getChatConfig, getChatMessages, renderMarkdown, streamChat, submitChatLead, type ChatLeadError } from '@/lib/chat';
import { emailError, phoneError } from '@/lib/validate';

const DEFAULT_GREETING = "Hi! 👋 I'm the ASPR assistant. Ask me about our services, prices, how we work — or tell me what you'd like to build.";
const SESSION_KEY = 'aspr.chat.sessionId';
const OPEN_KEY = 'aspr.chat.open';
const EMPTY_LEAD = { name: '', email: '', phone: '', need: '', brief: '' };

interface Msg { role: 'user' | 'assistant'; content: string; streaming?: boolean; error?: boolean }
type LeadKey = 'name' | 'email' | 'phone' | 'message';

// Storage can throw outright in private modes, so every access is guarded.
type StoreName = 'localStorage' | 'sessionStorage';
const store = {
  get: (s: StoreName, k: string) => { try { return window[s].getItem(k); } catch { return null; } },
  set: (s: StoreName, k: string, v: string | null) => { try { if (v == null) window[s].removeItem(k); else window[s].setItem(k, v); } catch { /* convenience only */ } },
};

/** Plain text of a reply, for the screen-reader announcement. */
const plain = (md: string) => md.replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

const MD = [
  '[&_p+p]:mt-2.5 [&_p+ul]:mt-2 [&_p+ol]:mt-2 [&_ul+p]:mt-2.5 [&_ol+p]:mt-2.5',
  '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:mt-1 [&_li]:marker:text-brand-soft',
  '[&_a]:text-brand-soft [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-text',
  '[&_strong]:font-semibold [&_strong]:text-text [&_code]:rounded [&_code]:bg-white/[0.08] [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em]',
].join(' ');

const inputCls = (bad?: boolean) =>
  `block w-full min-h-11 rounded-xl border bg-white/[0.03] px-3.5 text-base text-text placeholder:text-subtle transition-colors focus:border-brand-soft focus:outline-none focus:ring-2 focus:ring-brand-soft/30 sm:text-sm ${bad ? 'border-danger' : 'border-line-strong'}`;

function LeadField({ id, label, error, optional, children }: { id: string; label: string; error?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">
        {label}{optional && <span className="ml-1 font-normal text-subtle">(optional)</span>}
      </label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function ChatWidget({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [starters, setStarters] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: DEFAULT_GREETING }]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [draft, setDraft] = useState('');
  const [showLead, setShowLead] = useState(false);
  const [lead, setLead] = useState(EMPTY_LEAD);
  const [leadErrs, setLeadErrs] = useState<Partial<Record<LeadKey, string>>>({});
  const [leadErr, setLeadErr] = useState('');
  const [leadSending, setLeadSending] = useState(false);
  const [leadRef, setLeadRef] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const ctrl = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const leadName = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const uid = useId();
  const fid = (k: string) => `${uid}-lead-${k}`;

  // Config, then any stored conversation.
  useEffect(() => {
    let alive = true;
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

  // Open state survives page changes; focus goes to the input on open and back to the launcher on close.
  useEffect(() => {
    store.set('sessionStorage', OPEN_KEY, open ? '1' : null);
    if (open) { const t = setTimeout(() => input.current?.focus(), 50); wasOpen.current = true; return () => clearTimeout(t); }
    if (wasOpen.current) { wasOpen.current = false; launcher.current?.focus(); }
  }, [open]);

  // Follow the transcript as it grows.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, showLead, open]);

  useEffect(() => { if (showLead) setTimeout(() => leadName.current?.focus(), 50); }, [showLead]);

  const remember = (id: string) => { setSessionId(id); store.set('localStorage', SESSION_KEY, id); };

  const patchLast = (fn: (m: Msg) => Msg) => setMessages((list) => {
    const next = [...list];
    const last = next[next.length - 1];
    if (last?.role === 'assistant') next[next.length - 1] = fn(last);
    return next;
  });

  const finishStreaming = () => patchLast((m) => (m.streaming ? { ...m, streaming: false, content: m.content || 'Stopped.' } : m));

  const send = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setShowLead(false);
    setStarters([]);
    setMessages((list) => [...list, { role: 'user', content: question }, { role: 'assistant', content: '', streaming: true }]);
    setLoading(true);
    setAnnounce('');
    let reply = '';
    ctrl.current = new AbortController();
    try {
      for await (const frame of streamChat(question, sessionId, window.location.pathname + window.location.hash, ctrl.current.signal)) {
        if (frame.type === 'start' || frame.type === 'done') remember(frame.sessionId);
        else if (frame.type === 'chunk') { reply += frame.text; patchLast((m) => ({ ...m, content: m.content + frame.text })); }
        else if (frame.type === 'lead') { if (!leadRef) setShowLead(true); }
        else if (frame.type === 'error') { reply = frame.message; patchLast((m) => ({ ...m, content: frame.message, error: true, streaming: false })); }
      }
    } catch {
      reply = "We couldn't reach the assistant. Please try again.";
      patchLast((m) => ({ ...m, content: reply, error: true, streaming: false }));
    } finally {
      ctrl.current = null;
      setLoading(false);
      finishStreaming();
      if (reply) setAnnounce(`Assistant: ${plain(reply)}`);
    }
  }, [loading, sessionId, leadRef]);

  // Other parts of the page can open the assistant (and ask a question) with:
  // window.dispatchEvent(new CustomEvent('aspr:chat', { detail: { question } }))
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    const onAsk = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
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
    setAnnounce('New conversation started.');
    getChatConfig().then((cfg) => cfg && setStarters(cfg.starters || []));
    input.current?.focus();
  };

  const submitLead = async (e: FormEvent) => {
    e.preventDefault();
    if (leadSending) return;
    const errs: Partial<Record<LeadKey, string>> = {};
    if (!lead.name.trim()) errs.name = 'Enter your name.';
    const em = emailError(lead.email); if (em) errs.email = em;
    const pe = phoneError(lead.phone); if (pe) errs.phone = pe;
    if (lead.brief.trim().length < 10) errs.message = 'Tell us a little about what you need.';
    setLeadErrs(errs);
    const first = (['name', 'email', 'phone', 'message'] as LeadKey[]).find((k) => errs[k]);
    if (first) { document.getElementById(fid(first))?.focus(); return; }
    setLeadSending(true); setLeadErr('');
    try {
      const res = await submitChatLead({
        name: lead.name.trim(), email: lead.email.trim(), phone: lead.phone.trim(),
        need: lead.need || 'Not sure yet', brief: lead.brief.trim(), sessionId: sessionId || undefined,
      });
      const thanks = `Thanks, ${lead.name.trim().split(/\s+/)[0]}! Your details are with the team. Your reference is **${res.reference}**. We reply within one working day.`;
      setLeadRef(res.reference);
      setShowLead(false);
      setLead(EMPTY_LEAD);
      setMessages((list) => [...list, { role: 'assistant', content: thanks }]);
      setAnnounce(plain(thanks));
      input.current?.focus();
    } catch (err) {
      const fields = (err as ChatLeadError).fields || {};
      setLeadErrs(fields);
      setLeadErr((err as Error).message);
    } finally {
      setLeadSending(false);
    }
  };

  const submitDraft = () => { const t = draft; setDraft(''); send(t); };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submitDraft(); }
  };

  const onPanelKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  };

  const setL = (k: keyof typeof EMPTY_LEAD) => (e: { target: { value: string } }) => setLead((l) => ({ ...l, [k]: e.target.value }));
  const errProps = (k: LeadKey) => ({ 'aria-invalid': leadErrs[k] ? true : undefined, 'aria-describedby': leadErrs[k] ? `${fid(k)}-error` : undefined });

  return (
    <>
      <button
        ref={launcher} type="button" onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close the assistant' : 'Chat with the ASPR assistant'} aria-expanded={open} aria-controls={open ? `${uid}-panel` : undefined}
        className={[
          'fixed bottom-5 right-5 z-[80] grid size-14 place-items-center rounded-full text-white sm:bottom-6 sm:right-6',
          'border border-white/15 shadow-[0_12px_32px_-8px_rgb(65_112_255/0.7)] transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-out-expo)]',
          'hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgb(139_92_246/0.7)] active:scale-95',
          open ? 'max-sm:hidden bg-surface-3' : 'bg-brand hover:bg-brand-strong',
        ].join(' ')}
      >
        {open ? <X aria-hidden="true" size={24} /> : <MessageCircle aria-hidden="true" size={25} strokeWidth={1.9} />}
        {!open && <span aria-hidden="true" className="absolute right-1 top-1 size-3 rounded-full border-2 border-bg bg-signal" />}
      </button>

      {open && (
        <section
          id={`${uid}-panel`} role="dialog" aria-labelledby={`${uid}-title`} onKeyDown={onPanelKey}
          className={[
            'fixed inset-0 z-[90] flex flex-col overflow-hidden bg-surface text-text',
            'sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-line-strong',
            'sm:shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.03)] motion-safe:animate-[page-in_0.35s_var(--ease-out-expo)_both]',
          ].join(' ')}
        >
          {/* Header */}
          <header className="relative flex items-center gap-3 border-b border-line bg-[linear-gradient(120deg,rgb(65_112_255/0.18),rgb(139_92_246/0.08)_60%,transparent)] px-4 py-3.5 pt-[max(0.875rem,env(safe-area-inset-top))]">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-soft/30 bg-brand/15 text-brand-soft">
              <Sparkles size={19} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={`${uid}-title`} className="font-sans text-[0.95rem] font-semibold tracking-normal text-text">ASPR Assistant</h2>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />Online · replies instantly
              </p>
            </div>
            <button type="button" onClick={reset} title="Start a new conversation" aria-label="Start a new conversation"
              className="grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-white/[0.06] hover:text-text">
              <RotateCcw aria-hidden="true" size={18} />
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close the assistant"
              className="grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-white/[0.06] hover:text-text">
              <X aria-hidden="true" size={20} />
            </button>
          </header>

          {/* Transcript */}
          <div ref={scroller} role="log" aria-live="off" aria-label="Conversation" className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-bg/40 px-4 py-5">
            {restoring && <p className="text-xs text-subtle">Restoring your conversation…</p>}

            {messages.map((m, i) => (
              <div key={i} className={`max-w-[88%] ${m.role === 'user' ? 'self-end' : 'self-start'}`}>
                <span className="sr-only">{m.role === 'user' ? 'You:' : 'Assistant:'}</span>
                <div className={[
                  'break-words px-3.5 py-2.5 text-[0.9rem] leading-relaxed',
                  m.role === 'user'
                    ? 'rounded-2xl rounded-br-md bg-brand-strong text-white'
                    : m.error
                      ? 'rounded-2xl rounded-bl-md border border-danger/40 bg-danger/10 text-text'
                      : `rounded-2xl rounded-bl-md border border-line bg-surface-2 text-muted ${MD}`,
                ].join(' ')}>
                  {m.role === 'user'
                    ? <span className="whitespace-pre-wrap">{m.content}</span>
                    : m.streaming && !m.content
                      ? <span className="flex h-5 items-center gap-1" role="img" aria-label="Typing">
                          {[0, 150, 300].map((d) => <i key={d} className="size-1.5 rounded-full bg-brand-soft/80 motion-safe:animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                        </span>
                      // renderMarkdown escapes every <, > and & before building its own tags, so this is safe.
                      : <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />}
                  {m.streaming && m.content ? <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-brand-soft motion-safe:animate-pulse" /> : null}
                </div>
              </div>
            ))}

            {starters.length > 0 && !loading && (
              <ul className="mt-1 flex flex-wrap gap-2" aria-label="Suggested questions">
                {starters.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => send(s)}
                      className="min-h-10 rounded-full border border-line-strong bg-white/[0.03] px-3.5 py-2 text-left text-[0.8rem] font-medium text-text transition-colors hover:border-brand-soft/50 hover:bg-white/[0.06]">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!showLead && !leadRef && !loading && messages.length > 2 && (
              <button type="button" onClick={() => setShowLead(true)}
                className="inline-flex min-h-10 items-center self-start rounded-full border border-brand-soft/30 bg-brand/15 px-4 text-[0.8rem] font-semibold text-brand-soft transition-colors hover:bg-brand/25 hover:text-text">
                Talk to the team →
              </button>
            )}

            {showLead && (
              <form onSubmit={submitLead} noValidate aria-labelledby={`${uid}-lead-title`} className="mt-1 space-y-3 rounded-2xl border border-line-strong bg-surface-2 p-4">
                <div>
                  <h3 id={`${uid}-lead-title`} className="eyebrow">Start a project</h3>
                  <p className="mt-1 text-xs text-muted">Leave your details. We reply within one working day.</p>
                </div>
                <LeadField id={fid('name')} label="Your name" error={leadErrs.name}>
                  <input ref={leadName} id={fid('name')} autoComplete="name" value={lead.name} onChange={setL('name')} className={inputCls(!!leadErrs.name)} {...errProps('name')} />
                </LeadField>
                <LeadField id={fid('email')} label="Email" error={leadErrs.email}>
                  <input id={fid('email')} type="email" inputMode="email" autoComplete="email" placeholder="you@company.com" value={lead.email} onChange={setL('email')} className={inputCls(!!leadErrs.email)} {...errProps('email')} />
                </LeadField>
                <LeadField id={fid('phone')} label="Phone or WhatsApp" optional error={leadErrs.phone}>
                  <input id={fid('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 555 010 2030" value={lead.phone} onChange={setL('phone')} className={inputCls(!!leadErrs.phone)} {...errProps('phone')} />
                </LeadField>
                <LeadField id={fid('need')} label="What do you need?" optional>
                  <select id={fid('need')} value={lead.need} onChange={setL('need')} className={`${inputCls()} cursor-pointer [&>option]:bg-surface ${lead.need ? '' : 'text-subtle!'}`}>
                    <option value="">Not sure yet</option>
                    {needs.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </LeadField>
                <LeadField id={fid('message')} label="About your project" error={leadErrs.message}>
                  <textarea id={fid('message')} rows={3} placeholder="What would you like to build?" value={lead.brief} onChange={setL('brief')}
                    className={`${inputCls(!!leadErrs.message)} resize-y py-2.5 leading-snug`} {...errProps('message')} />
                </LeadField>
                {leadErr && !Object.keys(leadErrs).length ? <p role="alert" className="text-xs text-danger">{leadErr}</p> : null}
                <div className="flex gap-2 pt-1">
                  <button type="submit" aria-disabled={leadSending || undefined}
                    className={`min-h-11 flex-1 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong ${leadSending ? 'cursor-progress opacity-75' : ''}`}>
                    {leadSending ? 'Sending…' : 'Send to the team →'}
                  </button>
                  <button type="button" onClick={() => { setShowLead(false); input.current?.focus(); }}
                    className="min-h-11 rounded-xl border border-line-strong px-4 text-sm font-medium text-muted transition-colors hover:text-text">
                    Not now
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Announcements for screen readers: finished replies only, never token-by-token. */}
          <p aria-live="polite" className="sr-only">{announce}</p>

          {/* Composer */}
          <div className="border-t border-line bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-end gap-2">
              <label htmlFor={`${uid}-input`} className="sr-only">Your question</label>
              <textarea
                id={`${uid}-input`} ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} rows={1} maxLength={1000}
                disabled={loading} placeholder="Ask about services, prices, timelines…"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-line-strong bg-white/[0.03] px-3.5 py-2.5 text-base leading-snug text-text placeholder:text-subtle transition-colors focus:border-brand-soft focus:outline-none focus:ring-2 focus:ring-brand-soft/30 disabled:opacity-60 sm:text-sm"
              />
              {loading ? (
                <button type="button" onClick={stop} aria-label="Stop the answer"
                  className="grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong text-text transition-colors hover:bg-white/[0.06]">
                  <Square aria-hidden="true" size={15} fill="currentColor" />
                </button>
              ) : (
                <button type="button" onClick={submitDraft} disabled={!draft.trim()} aria-label="Send"
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-strong text-white transition-colors hover:bg-brand-strong disabled:bg-white/[0.06] disabled:text-subtle">
                  <ArrowUp aria-hidden="true" size={19} strokeWidth={2.2} />
                </button>
              )}
            </div>
            <p className="mt-2 px-0.5 text-[0.7rem] leading-snug text-subtle">
              AI answers from our site content and may be incomplete. For an exact quote, <Link href="/quote" onClick={() => setOpen(false)} className="text-brand-soft underline-offset-2 hover:underline">send a brief</Link>.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
