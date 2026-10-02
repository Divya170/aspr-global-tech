import { SHOW_WORK } from '@/lib/flags';
import { notFound } from 'next/navigation';
import AskAiButton from '@/components/AskAiButton';
import ServiceDelivery from '@/components/ServiceDelivery';
import ServiceFaq from '@/components/ServiceFaq';
import ChatWidget from '@/components/chat/ChatWidget';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import StatusScreen, { primaryBtn } from '@/components/StatusScreen';
import { getHomeContent } from '@/lib/api';
import { serviceSlug } from '@/lib/services';

export const dynamic = 'force-dynamic';

/** Brief-builder need that matches each service, so "Start this project" pre-selects it. */
const NEED = {
  'Website Development': 'Website', 'App Development': 'App', 'SaaS & Software Solutions': 'SaaS / Software', 'AI & Chatbot Solutions': 'AI / Chatbot',
  'Game Development': 'Game', 'Logo Design': 'Logo', 'Graphics Design': 'Graphics', 'Video Editing': 'Video', SEO: 'SEO', 'Business Management': 'Business Systems',
};

async function load(slug) {
  const c = await getHomeContent();
  const service = c.services.find((s) => serviceSlug(s.name) === slug);
  return { c, service, d: (c.settings.serviceDetails || {})[slug] || {} };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  let data;
  try {
    data = await load(slug);
  } catch {
    return { title: 'Services' };
  }
  if (!data.service) notFound(); // here, before streaming starts, so the response is a real 404
  const { service, d } = data;
  return { title: `${service.name} Services`, description: `${d.tagline || service.line} ${d.intro || ''}`.slice(0, 300), alternates: { canonical: `/services/${slug}` } };
}

export default async function ServicePage({ params }) {
  const { slug } = await params;
  let data;
  try {
    data = await load(slug);
  } catch {
    return (
      <StatusScreen eyebrow="TEMPORARILY UNAVAILABLE" title="We couldn't load this service right now."
        body="Please try again in a minute — or email support@asprglobaltech.com." action={<a href={`/services/${slug}`} style={primaryBtn}>Try again →</a>} />
    );
  }
  const { c, service: s, d } = data;
  if (!s) notFound();

  const need = NEED[s.name];
  const startHref = need ? `/#start:${encodeURIComponent(need)}` : '/#start';
  const others = c.services.filter((x) => x.name !== s.name);
  const related = [...others.filter((x) => x.pillar === s.pillar), ...others.filter((x) => x.pillar !== s.pillar)].slice(0, 3);
  const work = SHOW_WORK ? (c.work || []).filter((w) => w.pillar === s.pillar) : [];

  return (
    <>
      <SiteHeader active="Services" />
      <main id="main" className="sv sd">
        <section className="sd-hero">
          <div aria-hidden="true" className="ab-facts-orb ab-facts-orb-1" />
          <div className="sv-wrap sd-hero-in">
            <div className="sd-hero-text">
              <nav className="sd-crumbs" aria-label="Breadcrumb"><a href="/services">Services</a><span>/</span>{s.name}</nav>
              <span className="sd-pill"><b aria-hidden="true">{s.icon}</b>{s.pillar} · Service {s.num}</span>
              <h1 className="sv-h1">{s.name}</h1>
              <p className="sd-tagline">{d.tagline || s.line}</p>
              {d.intro ? <p className="sv-lead">{d.intro}</p> : null}
              <div className="sv-ctas">
                <a href={startHref} className="sv-btn sv-btn-main">Start this project →</a>
                <AskAiButton className="sv-btn sv-btn-ghost" question={`Tell me more about your ${s.name} service — what's included and what does it cost?`}><b aria-hidden="true">smart_toy</b>Ask AI about it</AskAiButton>
              </div>
            </div>
            <div className="sd-hero-media">
              <img src={s.img} alt={s.alt} style={{ objectPosition: s.pos }} />
              {(d.outcomes || []).length ? (
                <div className="sd-outcomes">
                  {d.outcomes.map(([k, v]) => <div key={v}><strong>{k}</strong><span>{v}</span></div>)}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="sd-facts">
          <div className="sv-wrap sd-facts-grid">
            <div><b aria-hidden="true">schedule</b><span>Typical timeline</span><strong>{d.timeline || 'Agreed in your scope'}</strong></div>
            <div><b aria-hidden="true">payments</b><span>Typical budget</span><strong>{d.budget || 'Fixed quote after a short call'}</strong></div>
            <div><b aria-hidden="true">verified</b><span>You always get</span><strong>Written scope · fixed price · full ownership</strong></div>
          </div>
        </section>

        <section className="sd-section">
          <div className="sv-wrap sd-two">
            <div>
              <h2 className="sv-h2">What&apos;s included</h2>
              <ul className="sd-incl">
                {(d.deliverables || []).map((x) => <li key={x}><b aria-hidden="true">check</b>{x}</li>)}
              </ul>
            </div>
            <aside className="sd-ideal">
              <p className="sd-ideal-h"><b aria-hidden="true">group</b>Perfect for</p>
              <ul>{(d.idealFor || []).map((x) => <li key={x}>{x}</li>)}</ul>
              {(d.addOns || []).length ? (
                <>
                  <p className="sd-ideal-h" style={{ marginTop: '22px' }}><b aria-hidden="true">add_circle</b>Popular add-ons</p>
                  <div className="sd-tags">{d.addOns.map((x) => <span key={x}>{x}</span>)}</div>
                </>
              ) : null}
            </aside>
          </div>
        </section>

        <ServiceDelivery process={d.process || []} tech={d.tech || []} serviceName={s.name} />

        {work.length ? (
          <section className="sd-section sd-alt">
            <div className="sv-wrap">
              <div className="sv-row-head">
                <h2 className="sv-h2">Recent {s.pillar.toLowerCase()} work</h2>
                <a href="/company#work" className="sv-link">See all work →</a>
              </div>
              <div className="sd-work">
                {work.slice(0, 3).map((w) => (
                  <div key={w.client} className="sd-work-card">
                    <div className="sd-work-img"><img src={w.img} alt={w.alt} loading="lazy" style={{ objectPosition: w.pos }} /></div>
                    <div className="sd-tags">{(w.scope || []).map((x) => <span key={x}>{x}</span>)}</div>
                    <h3>{w.client}</h3>
                    <p>{w.outcome}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <ServiceFaq faqs={d.faqs || []} serviceName={s.name} timeline={d.timeline} budget={d.budget} />

        <section className="sd-section sd-alt">
          <div className="sv-wrap">
            <div className="sv-row-head">
              <h2 className="sv-h2">You might also need</h2>
              <a href="/services" className="sv-link">All services →</a>
            </div>
            <div className="sd-related">
              {related.map((x) => (
                <a key={x.name} href={`/services/${serviceSlug(x.name)}`} className="sd-rel">
                  <b aria-hidden="true">{x.icon}</b>
                  <span><strong>{x.name}</strong><small>{((c.settings.serviceDetails || {})[serviceSlug(x.name)] || {}).tagline || x.line}</small></span>
                  <i aria-hidden="true">→</i>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="sv-cta">
          <div className="sv-wrap sv-cta-in">
            <div>
              <h2>Ready to start your {s.name.toLowerCase()} project?</h2>
              <p>Tell us your goal. We reply within one working day, then send a fixed written quote after a short call.</p>
            </div>
            <div className="sv-ctas">
              <a href={startHref} className="sv-btn sv-btn-white">Start this project →</a>
              <a href="https://wa.me/917539907704" target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn-line">WhatsApp us</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
