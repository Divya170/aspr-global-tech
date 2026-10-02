import AskAiButton from '@/components/AskAiButton';
import { AlwaysIncluded, PackCards, StepsStepper } from '@/components/ServicesExtras';
import ChatWidget from '@/components/chat/ChatWidget';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import StatusScreen, { primaryBtn } from '@/components/StatusScreen';
import { getHomeContent } from '@/lib/api';
import { serviceSlug } from '@/lib/services';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Services — Websites, Apps, SaaS, AI, Games, Brand & SEO',
  description: 'Ten services from one team: website and app development, SaaS, AI chatbots, games, logo and graphic design, video, SEO and business systems. Typical timelines and budgets for each.',
  alternates: { canonical: '/services' },
};

const PILLARS = [
  { key: 'Build', icon: 'construction', title: 'Build', sub: 'Websites, apps, software, AI and games — engineered to last.' },
  { key: 'Brand', icon: 'palette', title: 'Brand', sub: 'Logos, graphics and video that make you instantly recognisable.' },
  { key: 'Grow', icon: 'trending_up', title: 'Grow', sub: 'SEO and business systems that bring customers and save hours.' },
];


export default async function ServicesPage() {
  let c;
  try {
    c = await getHomeContent();
  } catch {
    return (
      <StatusScreen eyebrow="TEMPORARILY UNAVAILABLE" title="We couldn't load our services right now."
        body="Please try again in a minute — or email support@asprglobaltech.com." action={<a href="/services" style={primaryBtn}>Try again →</a>} />
    );
  }
  const det = c.settings.serviceDetails || {};
  const steps = c.steps || [];

  return (
    <>
      <SiteHeader active="Services" />
      <main id="main" className="sv">
        <section className="sv-hero">
          <div aria-hidden="true" className="ab-facts-orb ab-facts-orb-1" />
          <div className="sv-wrap sv-hero-in">
            <p className="sv-eyebrow">SERVICES</p>
            <h1 className="sv-h1">Ten services. One team. <span>Zero hand-offs.</span></h1>
            <p className="sv-lead">From the first logo sketch to the app in the store and the customers finding you on Google — one team plans, builds and grows it with you.</p>
            <div className="sv-ctas">
              <a href="/#start" className="sv-btn sv-btn-main">Start a project →</a>
              <AskAiButton className="sv-btn sv-btn-ghost" question="Which of your services fits my business?"><b aria-hidden="true">smart_toy</b>Ask AI which fits</AskAiButton>
            </div>
            <nav className="sv-jump" aria-label="Jump to a service">
              {c.services.map((s) => (
                <a key={s.name} href={`/services/${serviceSlug(s.name)}`}><b aria-hidden="true">{s.icon}</b>{s.name}</a>
              ))}
            </nav>
          </div>
        </section>

        {PILLARS.map((p) => {
          const list = c.services.filter((s) => s.pillar === p.key);
          if (!list.length) return null;
          return (
            <section key={p.key} className="sv-pillar">
              <div className="sv-wrap">
                <div className="sv-pillar-head">
                  <span className="sv-pillar-icon" aria-hidden="true">{p.icon}</span>
                  <div>
                    <h2>{p.title}</h2>
                    <p>{p.sub}</p>
                  </div>
                  <span className="sv-count">{list.length} services</span>
                </div>
                <div className="sv-cards">
                  {list.map((s) => {
                    const slug = serviceSlug(s.name);
                    const d = det[slug] || {};
                    return (
                      <a key={s.name} href={`/services/${slug}`} className="sv-card">
                        <div className="sv-card-img"><img src={s.img} alt={s.alt} loading="lazy" style={{ objectPosition: s.pos }} /></div>
                        <div className="sv-card-body">
                          <div className="sv-card-top"><span className="sv-card-icon" aria-hidden="true">{s.icon}</span><span className="sv-card-num">{s.num}</span></div>
                          <h3>{s.name}</h3>
                          <p className="sv-card-tag">{d.tagline || s.line}</p>
                          <ul>{(d.deliverables || []).slice(0, 3).map((x) => <li key={x}><b aria-hidden="true">check</b>{x}</li>)}</ul>
                          <div className="sv-card-meta">
                            {d.timeline ? <span><b aria-hidden="true">schedule</b>{d.timeline}</span> : null}
                            <span className="sv-card-go">View service →</span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        <AlwaysIncluded />
        <StepsStepper steps={steps} />
        <PackCards packages={c.packages || []} />

        <section className="sv-cta">
          <div className="sv-wrap sv-cta-in">
            <div>
              <h2>Tell us what you want to build.</h2>
              <p>We reply within one working day with next steps — and a fixed written quote after a short call.</p>
            </div>
            <div className="sv-ctas">
              <a href="/#start" className="sv-btn sv-btn-white">Start a project →</a>
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
