'use client';

// Home "Ready-to-deploy solutions": an interactive viewer for the ready-made products. A tab
// strip picks the product (auto-advancing until the visitor chooses), and the stage shows its
// screenshot, features and who it's for, with a "Book a demo" action.

import { useEffect, useState } from 'react';

export default function ProductViewer({ products = [], details = {} }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || products.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % products.length), 4500);
    return () => clearInterval(id);
  }, [auto, products.length]);

  const p = products[active];
  if (!p) return null;
  const d = details[p.name] || {};
  const pick = (i) => { setActive(i); setAuto(false); };

  return (
    <div className="pv" onMouseEnter={() => setAuto(false)}>
      <div className="pv-tabs" role="tablist" aria-label="Products">
        {products.map((x, i) => (
          <button key={x.name} type="button" role="tab" aria-selected={i === active} className={`pv-tab${i === active ? ' is-on' : ''}`} onClick={() => pick(i)}>
            <span className="pv-tab-icon" aria-hidden="true">{x.icon}</span>
            <span className="pv-tab-text"><b>{x.name}</b><small>{x.tag}</small></span>
            {i === active && auto ? <span className="pv-timer" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>

      <div className="pv-stage" role="tabpanel" aria-label={p.name} key={p.name}>
        <div className="pv-shot">
          <img src={p.img} alt={p.alt} loading="lazy" style={{ objectPosition: p.pos }} />
          <span className="pv-badge"><b aria-hidden="true">bolt</b>Ready to deploy</span>
        </div>
        <div className="pv-info">
          <p className="pv-name">{p.name}</p>
          <p className="pv-tag">{p.tag}</p>
          <ul className="pv-features">
            {(d.features || []).map((f, i) => <li key={f} style={{ '--i': i }}><b aria-hidden="true">check</b>{f}</li>)}
          </ul>
          {d.bestFor ? <p className="pv-best"><b aria-hidden="true">storefront</b>Best for: {d.bestFor}</p> : null}
          <div className="pv-actions">
            <a href="#contact" onClick={p.demo} className="pv-demo">Book a demo →</a>
            <span className="pv-note">Customised to your business</span>
          </div>
        </div>
      </div>
    </div>
  );
}
