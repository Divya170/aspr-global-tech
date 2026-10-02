'use client';

// Service page: "How we deliver it" as a connected, auto-playing step timeline, and
// "Tools & technology" as brand-coloured tiles with a plain-English note for each tool.

import { useEffect, useRef, useState } from 'react';
import { mono, TECH } from './AboutShowcase';

const STEP_ICON = [
  [/discover|brief|map|audit|concept/i, 'travel_explore'], [/design|sketch|prototype|rough/i, 'draw'],
  [/build|production|fix|train|refine|polish|grow|test/i, 'construction'], [/launch|deliver|report|scale|deploy/i, 'rocket_launch'],
];
const stepIcon = (name, i) => (STEP_ICON.find(([re]) => re.test(name)) || [null, ['flag', 'draw', 'construction', 'rocket_launch'][i] || 'flag'])[1];

/** What each tool does, in words a client can follow. */
const ROLE = {
  React: 'Fast, interactive interfaces', 'Next.js': 'SEO-friendly, lightning-fast sites', TypeScript: 'Safer, more reliable code', 'Tailwind CSS': 'Consistent, modern styling',
  WordPress: 'Easy content editing', Shopify: 'Proven online stores', Vercel: 'Global, fast hosting', 'Node.js': 'Scalable back-end services',
  NestJS: 'Structured, secure APIs', Python: 'Data, AI and automation', Django: 'Robust web platforms', PostgreSQL: 'Reliable business data',
  MongoDB: 'Flexible data storage', SQLite: 'Lightweight local data', AWS: 'Secure, scalable cloud', Stripe: 'Payments and subscriptions',
  Flutter: 'One app for iOS + Android', 'React Native': 'Native-feeling cross-platform apps', Kotlin: 'Native Android features', Swift: 'Native iPhone features',
  Firebase: 'Logins, push and real-time data', 'Google Gemini': 'Fast, accurate AI answers', OpenAI: 'Advanced language AI', Claude: 'Careful, reliable AI reasoning',
  'WhatsApp API': 'Bots inside WhatsApp', 'Vector search': 'AI that searches your documents', Unity: 'Mobile, PC and web games', 'C#': 'Game logic and systems',
  Blender: '3D models and animation', Photoshop: 'Image editing and art', 'Unity Ads': 'Earn from your game', 'Adobe Illustrator': 'Crisp, scalable logos',
  Illustrator: 'Vector graphics', InDesign: 'Brochures and print layouts', Figma: 'Collaborative design', 'Canva templates': 'Easy edits for your team',
  'Premiere Pro': 'Professional video editing', 'After Effects': 'Motion graphics and titles', 'DaVinci Resolve': 'Colour grading', CapCut: 'Quick social edits',
  'Google Search Console': 'Google indexing and health', 'Google Analytics 4': 'Visitor and conversion tracking', Ahrefs: 'Keywords and backlinks', Semrush: 'Competitor research',
  'Schema.org': 'Rich results on Google', 'Power BI': 'Business dashboards',
};

export default function ServiceDelivery({ process = [], tech = [], serviceName = '' }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [seen, setSeen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || !auto || process.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % process.length), 2800);
    return () => clearInterval(id);
  }, [seen, auto, process.length]);

  const pct = process.length > 1 ? (active / (process.length - 1)) * 100 : 100;

  return (
    <div ref={ref} className={`sdl${seen ? ' is-seen' : ''}`}>
      {process.length ? (
        <section className="sd-section sd-alt">
          <div className="sv-wrap">
            <div className="sv-row-head">
              <h2 className="sv-h2">How we deliver it</h2>
              <span className="sv-muted">{process.length} clear steps · you see progress at every one</span>
            </div>
            <div className="sdl-flow" onMouseLeave={() => setAuto(true)} style={{ '--n': process.length }}>
              <div className="sdl-rail" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
              <ol className="sdl-steps">
                {process.map(([k, v], i) => (
                  <li key={k} style={{ '--i': i }} className={`sdl-step${i === active ? ' is-on' : ''}${i < active ? ' is-done' : ''}`}
                    onMouseEnter={() => { setAuto(false); setActive(i); }} onFocus={() => { setAuto(false); setActive(i); }} tabIndex={0}>
                    <span className="sdl-dot" aria-hidden="true">{i < active ? '✓' : String(i + 1).padStart(2, '0')}</span>
                    <div className="sdl-card">
                      <span className="sdl-icon" aria-hidden="true">{stepIcon(k, i)}</span>
                      <p className="sdl-n">STEP {String(i + 1).padStart(2, '0')}</p>
                      <h3>{k}</h3>
                      <p className="sdl-d">{v}</p>
                      <span className="sdl-bar" aria-hidden="true"><span /></span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      {tech.length ? (
        <section className="sd-section">
          <div className="sv-wrap">
            <div className="sv-row-head">
              <h2 className="sv-h2">Tools &amp; technology</h2>
              <span className="sv-muted">Proven tools, so {serviceName ? `your ${serviceName.toLowerCase()} project` : 'your project'} is easy to maintain and grow</span>
            </div>
            <div className="sdl-tech">
              {tech.map((name, i) => {
                const [bg, fg] = TECH[name] || ['#1A4AD8', '#fff'];
                return (
                  <div key={name} className="sdl-tile" style={{ '--i': i, '--c': bg }}>
                    <span className="sdl-badge" style={{ background: bg, color: fg }}>{mono(name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <p className="sdl-tname">{name}</p>
                      {ROLE[name] ? <p className="sdl-trole">{ROLE[name]}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
