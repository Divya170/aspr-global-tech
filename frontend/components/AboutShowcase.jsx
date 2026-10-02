'use client';

// About page: an animated facts band and an interactive team + tech-stack explorer.
// Numbers count up on first view; stack categories cycle until the visitor picks one.
// All motion is skipped for visitors who prefer reduced motion.

import { useEffect, useRef, useState } from 'react';

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fires once when the element first scrolls into view. */
function useSeen(threshold = 0.3) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
}

function useCountUp({ to, run, duration = 1400 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReduced()) { setN(to); return; }
    let raf, start;
    const step = (ts) => {
      start ??= ts;
      const p = Math.min(1, (ts - start) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, run, duration]);
  return n;
}

// ─────────── Facts band ───────────

const STAT_META = {
  PROJECTS: { label: 'Projects delivered', icon: 'rocket_launch' },
  CLIENTS: { label: 'Happy clients', icon: 'handshake' },
  TEAM: { label: 'Specialists', icon: 'groups' },
  SERVICES: { label: 'Services, one team', icon: 'apps' },
};
const PILL_ICON = { ESTABLISHED: 'calendar_month', ENTITY: 'verified', 'BASED IN': 'public' };

/** "300+" → {from: 300, plus: true}; "10–15" → {from: 10, to: 15}. */
const parseStat = (v) => {
  const m = String(v).match(/^(\d+)(?:\s*[–-]\s*(\d+))?(\+)?$/);
  return m ? { from: Number(m[1]), to: m[2] ? Number(m[2]) : null, plus: !!m[3] } : null;
};

function Stat({ fact, run, i }) {
  const p = parseStat(fact.v);
  const meta = STAT_META[fact.k] || { label: fact.k, icon: 'star' };
  const a = useCountUp({ to: p?.from ?? 0, run });
  const b = useCountUp({ to: p?.to ?? 0, run });
  return (
    <div className="ab-stat" style={{ '--i': i }}>
      <span className="ab-stat-icon" aria-hidden="true">{meta.icon}</span>
      <p className="ab-stat-num">{p ? <>{a}{p.to ? <>–{b}</> : null}{p.plus ? <span>+</span> : null}</> : fact.v}</p>
      <p className="ab-stat-label">{meta.label}</p>
    </div>
  );
}

export function FactsBand({ facts = [] }) {
  const [ref, seen] = useSeen(0.25);
  const order = ['PROJECTS', 'CLIENTS', 'TEAM', 'SERVICES'];
  const stats = order.map((k) => facts.find((f) => f.k === k)).filter(Boolean);
  const pills = facts.filter((f) => !order.includes(f.k));
  return (
    <section data-screen-label="About — Facts" ref={ref} className={`ab-facts${seen ? ' is-seen' : ''}`}>
      <div aria-hidden="true" className="ab-facts-orb ab-facts-orb-1" />
      <div aria-hidden="true" className="ab-facts-orb ab-facts-orb-2" />
      <div style={{ position: 'relative', maxWidth: '1440px', margin: '0 auto', padding: 'clamp(35px,3.72vw,48px) clamp(20px,4vw,48px)' }}>
        <div className="ab-stats">
          {stats.map((f, i) => <Stat key={f.k} fact={f} run={seen} i={i} />)}
        </div>
        {pills.length ? (
          <div className="ab-pills">
            {pills.map((f) => (
              <span key={f.k} className="ab-pill">
                <span aria-hidden="true" className="ab-pill-icon">{PILL_ICON[f.k] || 'info'}</span>
                <span className="ab-pill-k">{f.k}</span>
                <span className="ab-pill-v">{f.v}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─────────── Team + stack explorer ───────────

const ROLE_ICON = {
  'Web engineers': 'code', 'App developers': 'smartphone', 'Game developers': 'sports_esports', Designers: 'palette',
  'Video editors': 'movie', SEO: 'travel_explore', 'Business systems': 'account_tree',
};

/** Brand-ish colours for each technology's tile. */
export const TECH = {
  React: ['#61DAFB', '#0B1220'], 'Next.js': ['#111111', '#fff'], TypeScript: ['#3178C6', '#fff'], 'Tailwind CSS': ['#38BDF8', '#0B1220'],
  'Node.js': ['#5FA04E', '#fff'], NestJS: ['#E0234E', '#fff'], Python: ['#3776AB', '#FFD43B'], Django: ['#0C4B33', '#fff'],
  Flutter: ['#02569B', '#fff'], 'React Native': ['#20232A', '#61DAFB'], Kotlin: ['#7F52FF', '#fff'], Swift: ['#F05138', '#fff'],
  Unity: ['#222222', '#fff'], 'C#': ['#68217A', '#fff'], PostgreSQL: ['#336791', '#fff'], MongoDB: ['#47A248', '#fff'],
  SQLite: ['#003B57', '#fff'], AWS: ['#232F3E', '#FF9900'], Vercel: ['#000000', '#fff'], Figma: ['#F24E1E', '#fff'], 'Adobe CC': ['#DA1F26', '#fff'],
  WordPress: ['#21759B', '#fff'], Shopify: ['#5E8E3E', '#fff'], Firebase: ['#FFCA28', '#1A1A1A'], Stripe: ['#635BFF', '#fff'],
  'Google Gemini': ['#1C69FF', '#fff'], OpenAI: ['#10A37F', '#fff'], Claude: ['#D97757', '#fff'], 'WhatsApp API': ['#25D366', '#fff'], 'Vector search': ['#6A8CFF', '#fff'],
  Blender: ['#E87D0D', '#fff'], Photoshop: ['#001E36', '#31A8FF'], 'Unity Ads': ['#222222', '#fff'], 'Adobe Illustrator': ['#330000', '#FF9A00'],
  InDesign: ['#49021F', '#FF3366'], Illustrator: ['#330000', '#FF9A00'], 'Canva templates': ['#00C4CC', '#fff'], 'Premiere Pro': ['#00005B', '#9999FF'],
  'After Effects': ['#00005B', '#9999FF'], 'DaVinci Resolve': ['#233A51', '#FFB200'], CapCut: ['#111111', '#fff'], 'Google Search Console': ['#4285F4', '#fff'],
  'Google Analytics 4': ['#E37400', '#fff'], Ahrefs: ['#FF8800', '#fff'], Semrush: ['#FF642D', '#fff'], 'Schema.org': ['#A33A2F', '#fff'], 'Power BI': ['#F2C811', '#1A1A1A'],
};
export const mono = (name) => {
  const clean = name.replace(/\.js$/i, '').replace(/[^A-Za-z0-9# ]/g, ' ').trim();
  const words = clean.split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : clean.slice(0, 2)).toUpperCase();
};

export function TeamStack({ teamRoles = [], stack = [] }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [ref, seen] = useSeen(0.2);

  useEffect(() => {
    if (!seen || !auto || prefersReduced() || stack.length < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % stack.length), 3200);
    return () => clearInterval(id);
  }, [seen, auto, stack.length]);

  const pick = (i) => { setActive(i); setAuto(false); };
  const cur = stack[active] || { items: [] };
  const all = stack.flatMap((s) => s.items || []);
  const techCount = all.length;

  return (
    <section data-screen-label={'About — Team & Stack'} ref={ref} className={`ab-ts${seen ? ' is-seen' : ''}`}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: 'clamp(46px,5.58vw,72px) clamp(20px,4vw,48px) clamp(40px,5vw,64px)', display: 'flex', flexWrap: 'wrap', gap: '48px clamp(32px,6vw,96px)' }}>
        <div style={{ flex: '4 1 320px' }}>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(14px,1.4vw,18px)', letterSpacing: '0.16em' }}>THE TEAM</h2>
          <p style={{ margin: '20px 0 12px', fontWeight: 800, fontSize: 'clamp(30px,3.4vw,46px)', letterSpacing: '-0.03em', lineHeight: 1.08 }}>
            10–15 specialists, <span className="ab-grad">no middle layer.</span>
          </p>
          <p style={{ margin: '0 0 26px', color: '#5A6380', fontSize: '16.5px', lineHeight: 1.6, maxWidth: '30em' }}>
            You talk to the people doing the work — every skill your project needs, under one roof.
          </p>
          <div className="ab-roles">
            {teamRoles.map((r, i) => (
              <span key={r} className="ab-role" style={{ '--i': i }}>
                <span aria-hidden="true" className="ab-role-icon">{ROLE_ICON[r] || 'person'}</span>{r}
              </span>
            ))}
          </div>
          <div className="ab-mini">
            <div><strong>{stack.length}</strong><span>disciplines</span></div>
            <div><strong>{techCount}+</strong><span>core technologies</span></div>
          </div>
        </div>

        <div style={{ flex: '6 1 460px', minWidth: 0 }}>
          <h2 style={{ margin: '0 0 20px', fontWeight: 800, fontSize: 'clamp(14px,1.4vw,18px)', letterSpacing: '0.16em' }}>WHAT WE BUILD WITH</h2>
          <div className="ab-explorer">
            <div className="ab-tabs" role="tablist" aria-label="Technology categories">
              {stack.map((s, i) => (
                <button key={s.h} type="button" role="tab" aria-selected={i === active} className={`ab-tab${i === active ? ' is-on' : ''}`} onClick={() => pick(i)}>
                  <span aria-hidden="true" className="ab-tab-icon">{s.icon}</span>{s.h}
                  {i === active && auto ? <span className="ab-tab-timer" aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
            <div className="ab-panel" role="tabpanel" aria-label={cur.h}>
              <div className="ab-panel-head">
                <span aria-hidden="true" className="ab-panel-icon">{cur.icon}</span>
                <div>
                  <p className="ab-panel-title">{cur.h}</p>
                  <p className="ab-panel-sub">{(cur.items || []).length} tools we ship with every week</p>
                </div>
              </div>
              <div className="ab-tiles" key={active}>
                {(cur.items || []).map((name, i) => {
                  const [bg, fg] = TECH[name] || ['#1A4AD8', '#fff'];
                  return (
                    <div key={name} className="ab-tile" style={{ '--i': i }}>
                      <span className="ab-tile-badge" style={{ background: bg, color: fg }}>{mono(name)}</span>
                      <span className="ab-tile-name">{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="ab-marquee" aria-hidden="true">
        <div className="ab-marquee-track">
          {[0, 1].map((k) => (
            <span key={k} className="ab-marquee-set">
              {all.map((name) => {
                const [bg, fg] = TECH[name] || ['#1A4AD8', '#fff'];
                return <span key={name} className="ab-marquee-item"><span className="ab-marquee-dot" style={{ background: bg, color: fg }}>{mono(name)}</span>{name}</span>;
              })}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
