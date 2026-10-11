import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Site } from '@/lib/types';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { Logo } from './Logo';
import { NewsletterForm } from './NewsletterForm';

/**
 * Site footer in main's design: a navy band that opens with a moving strip of our services, then
 * brand + socials, link columns, contact and newsletter, and a slim bottom line.
 */
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
  const heading = 'mb-4 text-[0.8125rem] font-extrabold uppercase tracking-[0.18em] text-white';
  const link = 'ft-link text-[0.9375rem] text-on-navy transition-colors hover:text-white';

  return (
    <footer className="relative mt-auto overflow-hidden bg-navy text-on-navy">
      {site.services.length > 0 && (
        <div aria-hidden="true" className="ft-strip">
          <div className="ft-strip-track">
            {[0, 1].map((k) => (
              <span key={k} className="flex shrink-0 items-center">
                {site.services.map((s, i) => (
                  <span key={s.slug} className={`ft-strip-item ${i % 2 ? 'is-soft' : ''}`}>
                    <span className="ft-strip-badge"><Icon name={s.icon} size={20} /></span>{s.name}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}

      <Container size="xl" className="relative grid gap-12 py-[clamp(40px,5vw,64px)] lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo tone="white" />
          <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed">
            ASPR Global Tech is a software studio building premium websites, 3D experiences, web applications, custom software and mobile apps for businesses worldwide.
          </p>
          {socials.length > 0 && (
            <ul className="mt-5 flex gap-2.5" aria-label="Social media">
              {socials.map(({ href, label, icon: I }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="ft-social">
                    <I size={19} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 max-w-sm"><NewsletterForm /></div>
        </div>

        <nav aria-label="Company" className="lg:col-span-2">
          <h2 className={heading}>Company</h2>
          <ul className="space-y-3">
            {company.map((l) => <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>)}
          </ul>
        </nav>

        <nav aria-label="Services" className="lg:col-span-3">
          <h2 className={heading}>Services</h2>
          <ul className="space-y-3">
            {site.services.map((s) => <li key={s.slug}><Link href={`/services/${s.slug}`} className={link}>{s.name}</Link></li>)}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <h2 className={heading}>Contact</h2>
          <ul className="space-y-4 text-[0.9375rem]">
            <li><a href={`mailto:${c.email}`} className="flex gap-3 transition-colors hover:text-white"><Mail size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-soft" />{c.email}</a></li>
            <li><a href={c.phoneHref} className="flex gap-3 transition-colors hover:text-white"><Phone size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-soft" />{c.phone}</a></li>
            <li className="flex gap-3"><MapPin size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-soft" /><span>{c.address}</span></li>
          </ul>
          <p className="mt-4 text-[0.8125rem] leading-relaxed">{c.hours}</p>
        </div>
      </Container>
      <div aria-hidden="true" className="fx-watermark pointer-events-none relative -mb-[0.12em] select-none text-center text-[clamp(4rem,19vw,17rem)]">ASPR</div>
      <div className="relative border-t border-brand-soft/20">
        <Container size="xl" className="flex flex-col gap-3 py-6 text-[0.8125rem] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} ASPR Global Tech. All rights reserved.</p>
          <ul className="flex gap-6">
            <li><Link href="/privacy-policy" className="ft-link transition-colors hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms" className="ft-link transition-colors hover:text-white">Terms &amp; Conditions</Link></li>
          </ul>
        </Container>
      </div>
    </footer>
  );
}
