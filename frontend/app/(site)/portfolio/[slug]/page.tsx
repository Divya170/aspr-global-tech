import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, Check, TrendingUp } from 'lucide-react';
import { CTASection } from '@/components/sections/CTASection';
import { PortfolioCard } from '@/components/sections/PortfolioCard';
import { TestimonialCard } from '@/components/sections/TestimonialCard';
import { TrackPortfolioView } from '@/components/sections/TrackPortfolioView';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/ui/JsonLd';
import { Reveal } from '@/components/ui/Reveal';
import { api } from '@/lib/api';
import { abs, pageMeta } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import type { ProjectDetail } from '@/lib/types';
import '@/components/pages/content/content.css';

type Props = { params: Promise<{ slug: string }> };

const getProject = (slug: string) => api<ProjectDetail>(`/projects/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProject(slug);
  return pageMeta({
    title: p.seoTitle || `${p.title}${p.category ? ` · ${p.category.name}` : ''}`,
    description: p.seoDescription || p.summary || undefined,
    path: `/portfolio/${p.slug}`,
    image: p.coverImage,
  });
}

const STANDARD_PROCESS = ['Discovery', 'Design', 'Development', 'Testing', 'Launch'];
const isVideoFile = (src: string) => /\.(mp4|webm)(\?.*)?$/i.test(src);
const paragraphs = (text: string) => text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);

/** YouTube / Vimeo URL → privacy-friendly embed URL, or null. */
function embedUrl(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const clean = (id: string | undefined | null) => (id && /^[\w-]{6,20}$/.test(id) ? id : null);
  if (host === 'youtu.be') { const id = clean(u.pathname.slice(1)); return id && `https://www.youtube-nocookie.com/embed/${id}`; }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = clean(u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1]);
    return id && `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(\d{6,12})/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

/** Case-study section: sticky label column (outlined number + heading) beside the content on desktop, stacked on mobile. */
function Block({ id, label, title, children }: { id: string; label: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="fx-divider py-14 sm:py-20">
      <Container>
        <Reveal className="grid gap-6 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <p className="ct-outline-n ct-cs-n">{label}</p>
              <h2 id={id} className="text-heading mt-4">{title}</h2>
            </div>
          </div>
          <div className="lg:col-span-8">{children}</div>
        </Reveal>
      </Container>
    </section>
  );
}

function Text({ text }: { text: string }) {
  return <div className="prose-aspr max-w-3xl">{paragraphs(text).map((t, i) => <p key={i}>{t}</p>)}</div>;
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProject(slug);
  const url = `${SITE_URL}/portfolio/${p.slug}`;
  const video = p.videoUrl?.trim() || '';
  const embed = video && !video.startsWith('/api/media') && !isVideoFile(video) ? embedUrl(video) : null;
  const selfHosted = video && (video.startsWith('/api/media') || (video.startsWith('/') && isVideoFile(video))) ? video : null;
  const showStandardProcess = p.process.length === 0 && p.caseStudy;

  let n = 0;
  const num = () => String(++n).padStart(2, '0');

  return (
    <>
      <TrackPortfolioView slug={p.slug} />
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'CreativeWork', '@id': `${url}#work`,
        name: p.title, url, description: p.seoDescription || p.summary || undefined,
        ...(p.coverImage && { image: abs(p.coverImage) }),
        ...(p.year && { dateCreated: String(p.year) }),
        ...(p.category && { genre: p.category.name }),
        ...(p.technologies.length > 0 && { keywords: p.technologies.map((t) => t.name).join(', ') }),
        ...(p.client && { sourceOrganization: { '@type': 'Organization', name: p.client } }),
        creator: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL },
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Portfolio', item: `${SITE_URL}/portfolio` },
          { '@type': 'ListItem', position: 3, name: p.title, item: url },
        ],
      }} />

      <div aria-hidden="true" className="fx-progress" />

      {/* ─────────── Hero ─────────── */}
      <section data-spotlight="" aria-labelledby="project-title" className="relative isolate overflow-hidden pb-12 pt-32 sm:pt-40">
        <div aria-hidden="true" className="fx-aurora -z-10 opacity-60"><i /><i /><i /></div>
        <div aria-hidden="true" className="bg-grid absolute inset-0" />
        <div aria-hidden="true" className="fx-grid-spot" />
        <div aria-hidden="true" className="absolute -top-40 left-1/2 h-[520px] w-[min(1100px,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(65_112_255/0.22),rgb(139_92_246/0.1)_55%,transparent)]" />
        <Container className="relative">
          <div className="animate-fade-up">
            <Link href={p.category ? `/portfolio?category=${p.category.slug}` : '/portfolio'} className="group/back inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors hover:text-text">
              <ArrowLeft aria-hidden="true" size={15} className="transition-transform duration-300 group-hover/back:-translate-x-1" />{p.category ? `${p.category.name} projects` : 'All projects'}
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {p.category && <Badge tone="brand">{p.category.name}</Badge>}
              {p.year && <span className="font-mono text-xs text-subtle">{p.year}</span>}
            </div>
            <h1 id="project-title" className="text-display mt-5 max-w-4xl">{p.title}</h1>
            {p.summary && <p className="text-lead mt-6 max-w-2xl">{p.summary}</p>}

            {(p.client || p.liveUrl) && (
              <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-5 border-t border-line pt-6">
                {p.client && (
                  <dl>
                    <dt className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">Client</dt>
                    <dd className="mt-1.5 text-text">{p.client}</dd>
                  </dl>
                )}
                {p.liveUrl && <ButtonLink href={p.liveUrl} variant="secondary" arrow="external" className="sm:ml-auto">Visit live site<span className="sr-only"> (opens in a new tab)</span></ButtonLink>}
              </div>
            )}
          </div>

          {p.coverImage && (
            <div className="relative mt-12 aspect-[4/3] animate-fade-up overflow-hidden rounded-[var(--radius-card)] border border-line-strong bg-surface-2 shadow-[0_40px_90px_-50px_rgb(65_112_255/0.9)] [animation-delay:120ms] sm:aspect-[16/9]">
              <Image
                src={p.coverImage} alt={p.coverAlt || p.title} fill priority sizes="(min-width: 1280px) 1216px, 100vw"
                className="object-cover" style={{ objectPosition: p.coverPos || 'center' }}
              />
            </div>
          )}
        </Container>
      </section>

      {p.overview && <Block id="overview" label={num()} title="Project overview"><Text text={p.overview} /></Block>}
      {p.challenge && <Block id="challenge" label={num()} title="The challenge"><Text text={p.challenge} /></Block>}
      {p.solution && <Block id="solution" label={num()} title="Our solution"><Text text={p.solution} /></Block>}

      {p.features.length > 0 && (
        <Block id="features" label={num()} title="Key features">
          <ul className="grid gap-3 sm:grid-cols-2">
            {p.features.map((f) => (
              <li key={f} className="ct-lift group flex gap-3 rounded-2xl border border-line bg-white/[0.02] p-4 leading-relaxed text-muted">
                <span aria-hidden="true" className="ct-check-icon text-brand-soft! bg-brand/15!"><Check size={15} strokeWidth={2.4} /></span><span>{f}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {p.technologies.length > 0 && (
        <Block id="technologies" label={num()} title="Technologies">
          <ul className="flex flex-wrap gap-2">
            {p.technologies.map((t) => (
              <li key={t.id} className="fx-chip rounded-full border border-line-strong bg-white/[0.03] px-4 py-2 text-sm text-text">{t.name}</li>
            ))}
          </ul>
        </Block>
      )}

      {(p.process.length > 0 || showStandardProcess) && (
        <Block id="process" label={num()} title="Development process">
          {p.process.length > 0 ? (
            <ol className="space-y-px overflow-hidden rounded-2xl border border-line bg-line">
              {p.process.map(([t, d], i) => (
                <li key={i} className="group flex gap-5 bg-bg p-5 transition-colors duration-300 hover:bg-surface sm:p-6">
                  <span className="ct-outline-n text-2xl transition-colors duration-300 group-hover:text-brand-soft">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-sans text-base font-semibold tracking-normal text-text">{t}</h3>
                    {d && <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <>
              <ol className="ct-flow" style={{ '--n': STANDARD_PROCESS.length } as React.CSSProperties}>
                {STANDARD_PROCESS.map((s, i) => (
                  <li key={s}>
                    <span className="ct-flow-dot">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-medium text-text">{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm text-muted">
                Every project follows the same staged process. <Link href="/process" className="text-brand-soft underline underline-offset-4 hover:text-text">See how we work</Link>.
              </p>
            </>
          )}
        </Block>
      )}

      {p.results.length > 0 && (
        <Block id="results" label={num()} title="Results">
          <ul className="grid gap-4 sm:grid-cols-2">
            {p.results.map((r) => (
              <li key={r} className="panel ct-lift group flex gap-4 p-5 sm:p-6">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/12 text-success transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-rotate-6 group-hover:scale-110"><TrendingUp size={19} /></span>
                <span className="self-center leading-relaxed text-text">{r}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {(p.gallery.length > 0 || embed || selfHosted) && (
        <section aria-labelledby="gallery-title" className="fx-divider py-14 sm:py-20">
          <Container>
            <p className="ct-outline-n ct-cs-n">{num()}</p>
            <h2 id="gallery-title" className="text-heading mt-4">{p.gallery.length > 0 ? 'Gallery' : 'Video'}</h2>
            <div className="mt-10 space-y-6 sm:space-y-8">
              {(embed || selfHosted) && (
                <Reveal className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2">
                  {embed ? (
                    <iframe
                      src={embed} title={`${p.title}: project video`} loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      referrerPolicy="strict-origin-when-cross-origin" allowFullScreen className="absolute inset-0 size-full"
                    />
                  ) : (
                    <video src={selfHosted!} controls preload="metadata" playsInline className="absolute inset-0 size-full bg-black object-contain" />
                  )}
                </Reveal>
              )}
              {p.gallery.map((g, i) => (
                <Reveal as="figure" key={`${g.src}-${i}`} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2">
                  {isVideoFile(g.src) ? (
                    <video src={g.src} controls preload="metadata" playsInline aria-label={g.alt || `${p.title} video`} className="block aspect-video w-full bg-black object-contain" />
                  ) : (
                    <Image src={g.src} alt={g.alt || `${p.title}, image ${i + 1}`} width={1600} height={1000} sizes="(min-width: 1280px) 1216px, 100vw" className="block h-auto w-full" />
                  )}
                  {g.alt && <figcaption className="sr-only">{g.alt}</figcaption>}
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {p.testimonial && (
        <section aria-labelledby="testimonial-title" className="border-t border-line py-14 sm:py-20">
          <Container size="lg">
            <h2 id="testimonial-title" className="eyebrow">What the client said</h2>
            <Reveal className="mt-6"><TestimonialCard t={p.testimonial} /></Reveal>
          </Container>
        </section>
      )}

      {(p.services.length > 0 || p.next) && (
        <section aria-label="Related" className="border-t border-line py-14 sm:py-20">
          <Container className="grid gap-12 lg:grid-cols-12">
            {p.services.length > 0 && (
              <div className={p.next ? 'lg:col-span-5' : 'lg:col-span-12'}>
                <h2 className="eyebrow">Services used</h2>
                <ul className="mt-6 divide-y divide-line border-y border-line">
                  {p.services.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/services/${s.slug}`} className="group flex items-center gap-4 py-4">
                        <span className="fx-icon grid size-10 shrink-0 place-items-center rounded-lg border border-line-strong text-brand-soft"><Icon name={s.icon} size={19} /></span>
                        <span className="flex-1 font-medium text-text transition-colors group-hover:text-brand-soft">{s.name}</span>
                        <ArrowUpRight aria-hidden="true" size={16} className="text-subtle transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-soft" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {p.next && (
              <div className={p.services.length > 0 ? 'lg:col-span-6 lg:col-start-7' : 'lg:col-span-6'}>
                <h2 className="eyebrow">Next project</h2>
                <div className="mt-6"><PortfolioCard project={p.next} /></div>
              </div>
            )}
          </Container>
        </section>
      )}

      <CTASection title="Have a similar project?" primary={{ label: 'Start Your Project', href: '/quote' }} secondary={{ label: 'View all work', href: '/portfolio' }} />
    </>
  );
}
