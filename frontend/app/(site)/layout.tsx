import { ChatWidget } from '@/components/chat/ChatWidget';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { JsonLd } from '@/components/ui/JsonLd';
import { api } from '@/lib/api';
import { DEFAULT_DESCRIPTION, SITE_URL } from '@/lib/site';
import type { Site } from '@/lib/types';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await api<Site>('/site');
  const c = site.settings.company;
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'ProfessionalService', '@id': `${SITE_URL}/#organization`,
        name: c.name, url: SITE_URL, logo: `${SITE_URL}/assets/aspr-logo.png`, description: DEFAULT_DESCRIPTION,
        email: c.email, telephone: c.phone, areaServed: 'Worldwide',
        address: { '@type': 'PostalAddress', streetAddress: c.address, addressLocality: 'Mettupalayam', addressRegion: 'Tamil Nadu', postalCode: '641305', addressCountry: 'IN' },
        sameAs: [c.instagramUrl, c.facebookUrl, c.linkedinUrl].filter(Boolean),
        makesOffer: site.services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.name, url: `${SITE_URL}/services/${s.slug}` } })),
      }} />
      <Navbar services={site.services} />
      <main id="main" className="flex-1">{children}</main>
      <Footer site={site} />
      <ChatWidget />
    </div>
  );
}
