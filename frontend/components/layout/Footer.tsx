import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Site } from '@/lib/types';
import { Container } from '@/components/ui/Container';
import { Logo } from './Logo';
import { NewsletterForm } from './NewsletterForm';

export function Footer({ site }: { site: Site }) {
  const c = site.settings.company;
  const year = new Date().getFullYear();
  const company = [
    { label: 'Home', href: '/' }, { label: 'Services', href: '/services' }, { label: 'Portfolio', href: '/portfolio' },
    { label: 'About', href: '/about' }, { label: 'Process', href: '/process' }, { label: 'Technologies', href: '/technologies' },
    { label: 'Insights', href: '/insights' }, { label: 'Careers', href: '/careers' }, { label: 'FAQ', href: '/faq' }, { label: 'Contact', href: '/contact' },
  ];
  const socials = [
    c.instagramUrl && { href: c.instagramUrl, label: 'Instagram', icon: Instagram },
    c.facebookUrl && { href: c.facebookUrl, label: 'Facebook', icon: Facebook },
    c.linkedinUrl && { href: c.linkedinUrl, label: 'LinkedIn', icon: Linkedin },
    c.whatsappUrl && { href: c.whatsappUrl, label: 'WhatsApp', icon: MessageCircle },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Instagram }[];

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-line bg-bg-2">
      <div aria-hidden="true" className="fx-aurora opacity-40"><i /><i /><i /></div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
      <Container className="relative grid gap-12 py-16 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
            ASPR Global Tech is a software studio building premium websites, 3D experiences, web applications, custom software and mobile apps for businesses worldwide.
          </p>
          <div className="mt-8 max-w-sm"><NewsletterForm /></div>
        </div>

        <nav aria-label="Company" className="lg:col-span-2">
          <h2 className="eyebrow mb-5 text-subtle!">Company</h2>
          <ul className="space-y-3 text-sm">
            {company.map((l) => <li key={l.href}><Link href={l.href} className="fx-link text-muted transition-colors hover:text-text">{l.label}</Link></li>)}
          </ul>
        </nav>

        <nav aria-label="Services" className="lg:col-span-3">
          <h2 className="eyebrow mb-5 text-subtle!">Services</h2>
          <ul className="space-y-3 text-sm">
            {site.services.map((s) => <li key={s.slug}><Link href={`/services/${s.slug}`} className="fx-link text-muted transition-colors hover:text-text">{s.name}</Link></li>)}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <h2 className="eyebrow mb-5 text-subtle!">Contact</h2>
          <ul className="space-y-4 text-sm text-muted">
            <li><a href={`mailto:${c.email}`} className="flex gap-3 transition-colors hover:text-text"><Mail size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />{c.email}</a></li>
            <li><a href={c.phoneHref} className="flex gap-3 transition-colors hover:text-text"><Phone size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />{c.phone}</a></li>
            <li className="flex gap-3"><MapPin size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" /><span>{c.address}</span></li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-subtle">{c.hours}</p>
          {socials.length > 0 && (
            <ul className="mt-6 flex gap-2" aria-label="Social media">
              {socials.map(({ href, label, icon: I }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="grid size-10 place-items-center rounded-full border border-line text-muted transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:bg-brand-strong hover:text-white hover:shadow-[0_10px_24px_-8px_color-mix(in_srgb,var(--color-brand)_48%,transparent)]">
                    <I size={17} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
      <div aria-hidden="true" className="fx-watermark pointer-events-none relative -mb-[0.12em] select-none text-center text-[clamp(4rem,19vw,17rem)]">ASPR</div>
      <div className="relative border-t border-line">
        <Container className="flex flex-col gap-3 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} ASPR Global Tech. All rights reserved.</p>
          <ul className="flex gap-6">
            <li><Link href="/privacy-policy" className="hover:text-text">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-text">Terms &amp; Conditions</Link></li>
          </ul>
        </Container>
      </div>
    </footer>
  );
}
