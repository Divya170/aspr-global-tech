'use client';

// Insights: a text-first article list (featured story + cards) and a structured article page
// with key takeaways, a sticky table of contents, checklists, tip boxes and sharing.

import { useEffect, useState } from 'react';
import AskAiButton from './AskAiButton';

const CAT = {
  Build: ['code', '#1A4AD8', '#EAF0FD'], Brand: ['palette', '#C2410C', '#FFF1E8'], Grow: ['trending_up', '#12996B', '#E7F8F1'],
  Process: ['account_tree', '#6A4CFF', '#F0EDFF'], Studio: ['groups', '#B4235F', '#FDECF3'],
};
const cat = (c) => CAT[c] || ['article', '#1A4AD8', '#EAF0FD'];
const anchor = (t) => 'h-' + String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lines = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

function CatChip({ c }) {
  const [icon, fg, bg] = cat(c);
  return <span className="in-cat" style={{ color: fg, background: bg }}><b aria-hidden="true">{icon}</b>{String(c).toUpperCase()}</span>;
}

// ─────────── List ───────────

export function InsightsList({ articles = [], filters = [] }) {
  const [feat, ...rest] = articles;
  return (
    <section className="in-list">
      <div className="in-wrap">
        <div className="in-filters" role="tablist" aria-label="Filter articles">
          {filters.map((f) => (
            <button key={f.label} type="button" role="tab" aria-selected={f.on} className={`in-filter${f.on ? ' is-on' : ''}`} onClick={f.pick}>
              {f.label !== 'All' ? <b aria-hidden="true">{cat(f.label)[0]}</b> : null}{f.label}<span>{f.count}</span>
            </button>
          ))}
        </div>

        {!articles.length ? <p className="in-empty">No articles in this category yet.</p> : null}

        {feat ? (
          <a href={feat.href} onClick={feat.open} className="in-feature" key={feat.slug}>
            <div className="in-feature-main">
              <div className="in-feature-top"><span className="in-badge">★ FEATURED</span><CatChip c={feat.rawCat} /></div>
              <h2>{feat.t}</h2>
              <p>{feat.excerpt}</p>
              <div className="in-meta in-meta-light">
                <span><b aria-hidden="true">person</b>{feat.author}</span><span><b aria-hidden="true">calendar_today</b>{feat.date}</span><span><b aria-hidden="true">schedule</b>{feat.readTime}</span>
              </div>
            </div>
            <span className="in-feature-go">Read article <b aria-hidden="true">arrow_forward</b></span>
          </a>
        ) : null}

        <div className="in-grid">
          {rest.map((a, i) => {
            const [icon, fg] = cat(a.rawCat);
            return (
              <a key={a.slug} href={a.href} onClick={a.open} className="in-card" style={{ '--i': i, '--c': fg }}>
                <div className="in-card-top"><CatChip c={a.rawCat} /><span className="in-card-icon" aria-hidden="true">{icon}</span></div>
                <h3>{a.t}</h3>
                <p>{a.excerpt}</p>
                <div className="in-meta">
                  <span><b aria-hidden="true">calendar_today</b>{a.date}</span><span><b aria-hidden="true">schedule</b>{a.readTime}</span>
                  <span className="in-card-go">Read <i aria-hidden="true">→</i></span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────── Article ───────────

function Share({ title }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  useEffect(() => { setUrl(window.location.href); }, []);
  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  const copy = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } };
  return (
    <div className="ar-share">
      <span>Share</span>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">in</a>
      <a href={`https://twitter.com/intent/tweet?url=${u}&text=${t}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X">𝕏</a>
      <a href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp"><b aria-hidden="true">chat</b></a>
      <button type="button" onClick={copy} aria-label="Copy link"><b aria-hidden="true">{copied ? 'check' : 'link'}</b></button>
    </div>
  );
}

export function ArticleView({ art = {}, related = [], onBack }) {
  const blocks = art.blocks || [];
  const toc = blocks.filter((b) => b.type === 'h2').map((b) => ({ id: anchor(b.text), t: b.text }));
  const [active, setActive] = useState(toc[0]?.id || '');
  const takeaways = lines((blocks.find((b) => b.type === 'takeaways') || {}).text);

  useEffect(() => {
    if (!('IntersectionObserver' in window) || !toc.length) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: '-20% 0px -70% 0px' });
    toc.forEach((h) => { const el = document.getElementById(h.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [art.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const jump = (id) => (e) => { e.preventDefault(); const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' }); };
  const [, fg] = cat(art.rawCat);
  const initials = String(art.author || 'ASPR').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="ar" style={{ '--c': fg }}>
      <header className="ar-head" style={{ '--c2': cat(art.rawCat)[1] }}>
        <span className="ar-head-glyph" aria-hidden="true">{cat(art.rawCat)[0]}</span>
        <div className="ar-head-in">
          <div className="ar-head-main">
            <a href="#insights" onClick={onBack} className="ar-back"><b aria-hidden="true">arrow_back</b>All insights</a>
            <span className="ar-kicker"><b aria-hidden="true">{cat(art.rawCat)[0]}</b>{String(art.rawCat || '').toUpperCase()} · INSIGHT</span>
            <h1>{art.t}</h1>
            {art.excerpt ? <p className="ar-standfirst">{art.excerpt}</p> : null}
            <div className="ar-byline">
              <span className="ar-author">
                <span className="ar-avatar" aria-hidden="true">{initials}</span>
                <span className="ar-author-text"><strong>{art.author}</strong><small>{art.date}</small></span>
              </span>
              <Share title={art.t} />
            </div>
          </div>
          <aside className="ar-glance" aria-label="At a glance">
            <p className="ar-glance-h">IN THIS ARTICLE</p>
            <div className="ar-glance-stats">
              <div><b aria-hidden="true">schedule</b><strong>{String(art.readTime || '').replace(/ read$/, '')}</strong><span>read</span></div>
              <div><b aria-hidden="true">segment</b><strong>{toc.length}</strong><span>sections</span></div>
              <div><b aria-hidden="true">bolt</b><strong>{takeaways.length}</strong><span>takeaways</span></div>
            </div>
            {takeaways[0] ? (
              <div className="ar-glance-take">
                <p>KEY IDEA</p>
                <span>{takeaways[0]}</span>
              </div>
            ) : null}
            {toc[0] ? <a href={`#${toc[0].id}`} onClick={jump(toc[0].id)} className="ar-glance-go">Start reading <b aria-hidden="true">south</b></a> : null}
          </aside>
        </div>
      </header>

      <div className="ar-layout">
        <aside className="ar-toc" aria-label="On this page">
          <p>ON THIS PAGE</p>
          <ol>{toc.map((h) => <li key={h.id}><a href={`#${h.id}`} onClick={jump(h.id)} className={active === h.id ? 'is-on' : ''}>{h.t}</a></li>)}</ol>
          <div className="ar-toc-cta">
            <p>Want help with this for your business?</p>
            <AskAiButton className="ar-toc-ask" question={`I just read "${art.t}". How can you help my business with this?`}><b aria-hidden="true">smart_toy</b>Ask our AI</AskAiButton>
          </div>
        </aside>

        <div className="ar-body">
          {blocks.map((b, i) => {
            switch (b.type) {
              case 'standfirst': return null;
              case 'h2': return <h2 key={i} id={anchor(b.text)}>{b.text}</h2>;
              case 'quote': return <blockquote key={i}><b aria-hidden="true">“</b>{b.text}</blockquote>;
              case 'takeaways': return (
                <div key={i} className="ar-take">
                  <p className="ar-box-h"><b aria-hidden="true">bolt</b>Key takeaways</p>
                  <ol>{lines(b.text).map((x, j) => <li key={j}><span>{j + 1}</span>{x}</li>)}</ol>
                </div>
              );
              case 'list': return <ul key={i} className="ar-list">{lines(b.text).map((x, j) => <li key={j}>{x}</li>)}</ul>;
              case 'checklist': return (
                <div key={i} className="ar-check">
                  <p className="ar-box-h"><b aria-hidden="true">checklist</b>Checklist</p>
                  <ul>{lines(b.text).map((x, j) => <li key={j}><b aria-hidden="true">check</b>{x}</li>)}</ul>
                </div>
              );
              case 'callout': return <div key={i} className="ar-tip"><b aria-hidden="true">lightbulb</b><p><strong>Tip: </strong>{b.text}</p></div>;
              default: return <p key={i}>{b.text}</p>;
            }
          })}

          <div className="ar-cta">
            <div>
              <p className="ar-cta-k">FROM THE ASPR TEAM</p>
              <h3>Want us to apply this to your project?</h3>
              <p>Tell us what you&apos;re building. We reply within one working day.</p>
            </div>
            <div className="ar-cta-btns">
              <a href="/#start" className="sv-btn sv-btn-white">Start a project →</a>
              <AskAiButton className="sv-btn sv-btn-line" question={`I just read "${art.t}". How can you help my business with this?`}><b aria-hidden="true">smart_toy</b>Ask AI</AskAiButton>
            </div>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="ar-related">
          <div className="in-wrap">
            <h2>Keep reading</h2>
            <div className="in-grid">
              {related.map((a, i) => {
                const [icon, c] = cat(a.rawCat);
                return (
                  <a key={a.slug} href={a.href} onClick={a.open} className="in-card" style={{ '--i': i, '--c': c }}>
                    <div className="in-card-top"><CatChip c={a.rawCat} /><span className="in-card-icon" aria-hidden="true">{icon}</span></div>
                    <h3>{a.t}</h3>
                    <p>{a.excerpt}</p>
                    <div className="in-meta"><span><b aria-hidden="true">schedule</b>{a.readTime}</span><span className="in-card-go">Read <i aria-hidden="true">→</i></span></div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
