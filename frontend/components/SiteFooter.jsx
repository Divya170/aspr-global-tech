'use client';

import { SHOW_WORK } from '@/lib/flags';
import { useState } from 'react';
import { subscribe } from '@/lib/api';

// Shared site footer: a moving strip of what we do, then one compact row — brand + socials, combined quick links, newsletter — and a slim bottom line.
// Newsletter state and handlers come from the page's view model (`v`).

const IG = 'https://www.instagram.com/aspr_globaltech/';
const FB = 'https://www.facebook.com/profile.php?id=61593394312825';
const WA = 'https://wa.me/917539907704';

const LINKS = [
  ['Services', '/#services'], ['Products', '/#products'], ...(SHOW_WORK ? [['Work', '/company#work']] : []),
  ['About', '/company#about'], ['Process', '/company#process'], ['Careers', '/company#careers'],
  ['Insights', '/company#insights'], ['FAQ', '/company#faq'], ['Contact', '/company#contact'],
];

const STRIP = [
  ['Websites', 'language'], ['Mobile Apps', 'smartphone'], ['SaaS', 'cloud'], ['AI Chatbots', 'smart_toy'], ['Games', 'sports_esports'],
  ['Logo & Brand', 'draw'], ['Graphics', 'palette'], ['Video', 'movie'], ['SEO', 'travel_explore'], ['Business Systems', 'account_tree'],
];
const STRIP2 = ['Think it', 'Build it', 'Scale it', 'Made in India', 'Loved worldwide', 'One team', 'You own everything', 'Plain answers'];

const SOCIAL = [
  { href: IG, label: 'Instagram', path: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.6a5.2 5.2 0 100 10.4 5.2 5.2 0 000-10.4zm0 8.6a3.4 3.4 0 110-6.8 3.4 3.4 0 010 6.8zm5.4-9.9a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z' },
  { href: FB, label: 'Facebook', path: 'M13.5 21.9v-7.7h2.6l.4-3h-3V9.3c0-.9.3-1.5 1.5-1.5h1.6V5.1c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6v7.7C5.6 21.2 2 17 2 12 2 6.5 6.5 2 12 2s10 4.5 10 10c0 5-3.6 9.2-8.5 9.9z' },
  { href: WA, label: 'WhatsApp', path: 'M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .7.5l.9 2.2c.1.2.1.4 0 .6l-.3.5-.5.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.6 2.1 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2.1 1c.3.2.5.2.6.4.1.1.1.7-.1 1.4z' },
];

const t = (x) => (x == null ? '' : x);

/** Newsletter state for pages that don't pass their own view model. */
function useNewsletter(source) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  return {
    subscribe: async (e) => {
      e.preventDefault();
      const v = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setErr(v ? 'That email looks incomplete — check for a missing @ or domain.' : 'Enter an email address.'); return; }
      setBusy(true); setErr('');
      try { const r = await subscribe(v, source); setDone(r.alreadySubscribed ? 'already' : 'new'); }
      catch (x) { setErr((x.fieldErrors && x.fieldErrors.email) || x.message); }
      finally { setBusy(false); }
    },
    subEmail: email, onSubEmail: (e) => { setEmail(e.target.value); setErr(''); }, subBusy: busy,
    subHasErr: !!err, subErr: err, subDone: !!done, subNotDone: !done,
    subTitle: done === 'already' ? "You're already on the list." : 'Subscribed ✓ — see you next month.',
    subNextHref: '/company#insights', subNextLabel: 'Read the latest insights →',
  };
}

export default function SiteFooter({ v: given, source = 'footer-services' }) {
  const own = useNewsletter(source);
  const v = given && given.subscribe ? given : own;
  return (
    <footer className="sf" style={{ background: '#16233F', color: '#C9D6F7' }}>
      {/* Moving strips: services one way, promises the other */}
      <div className="sf-strip" aria-hidden="true">
        <div className="sf-strip-track">
          {[0, 1].map((k) => (
            <span key={k} className="sf-strip-set">
              {STRIP.map(([label, icon], i) => (
                <span key={label} className={`sf-strip-item${i % 2 ? ' is-serif' : ''}`}>
                  <span className="sf-strip-badge">{icon}</span>{label}
                </span>
              ))}
            </span>
          ))}
        </div>
        <div className="sf-strip-track sf-strip-rev">
          {[0, 1].map((k) => (
            <span key={k} className="sf-strip-set">
              {STRIP2.map((label) => <span key={label} className="sf-strip-tag">{label}<i>●</i></span>)}
            </span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: 'clamp(40px,5vw,64px) clamp(20px,4vw,48px) 28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px clamp(32px,5vw,72px)' }}>
          {/* Brand */}
          <div style={{ flex: '3 1 260px' }}>
            <img src="/assets/aspr-logo-white.png" alt="ASPR Global Tech" style={{ height: '52px', width: 'auto' }} />
            <p style={{ margin: '16px 0 0', fontSize: '15px', lineHeight: 1.6, maxWidth: '22em' }}>Websites, apps, AI and brands — built by one team, for businesses worldwide.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="sf-social">
                  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d={s.path} fill="currentColor" /></svg>
                </a>
              ))}
              <a href="mailto:support@asprglobaltech.com" aria-label="Email" title="support@asprglobaltech.com" className="sf-social">
                <span aria-hidden="true" style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '20px', lineHeight: 1 }}>mail</span>
              </a>
            </div>
          </div>

          {/* Quick links, combined */}
          <nav aria-label="Footer" style={{ flex: '3 1 260px' }}>
            <p className="sf-h">EXPLORE</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, max-content))', gap: '12px 32px' }}>
              {LINKS.map(([label, href]) => <a key={label} href={href} className="sf-link">{label}</a>)}
            </div>
          </nav>

          {/* Newsletter */}
          <div style={{ flex: '3 1 280px' }}>
            <p className="sf-h">NEWSLETTER</p>
            <p style={{ margin: '0 0 14px', fontSize: '14.5px', lineHeight: 1.55, maxWidth: '24em' }}>One email a month: what we built and what we learned. No spam.</p>
            {v.subNotDone ? (
              <>
                <form onSubmit={v.subscribe} noValidate className="sf-sub">
                  <label htmlFor="nl" style={{ position: 'absolute', left: '-9999px' }}>Email address</label>
                  <input id="nl" type="email" required value={t(v.subEmail)} onChange={v.onSubEmail} aria-invalid={v.subHasErr} placeholder="you@company.com" />
                  <button type="submit" disabled={v.subBusy} aria-label="Subscribe">{v.subBusy ? '…' : '→'}</button>
                </form>
                {v.subHasErr ? <p role="alert" style={{ margin: '8px 0 0', color: '#F4C7C3', fontSize: '13.5px', fontWeight: 600 }}>{t(v.subErr)}</p> : null}
              </>
            ) : null}
            {v.subDone ? (
              <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '380px', border: '1px solid rgba(143,168,240,0.35)', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '12px 14px' }}>
                <span style={{ flex: '0 0 auto', width: '36px', height: '36px', borderRadius: '10px', background: '#1A4AD8', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: "'Material Symbols Rounded'", fontSize: '20px' }} aria-hidden="true">check</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>{t(v.subTitle)}</span>
                  <a href={v.subNextHref} style={{ fontWeight: 700, fontSize: '14px', color: '#8FA8F0' }}>{t(v.subNextLabel)}</a>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '10px 24px', marginTop: '48px', paddingTop: '22px', borderTop: '1px solid rgba(143,168,240,0.2)', fontSize: '13.5px' }}>
          <span>© 2026 ASPR Global Tech · Made in India, serving the world 🌍</span>
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
            <a href="mailto:support@asprglobaltech.com" className="sf-link">support@asprglobaltech.com</a>
            <a href="tel:+917539907704" className="sf-link">+91 75399 07704</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
