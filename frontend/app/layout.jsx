import './globals.css';
import './pseudo.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://asprglobaltech.com';
const DESCRIPTION = 'ASPR Global Tech builds websites, mobile apps, SaaS platforms, AI chatbots and games for businesses in the US and worldwide — then designs the brand and gets it found. One team, written scope, you own everything.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'ASPR Global Tech — Building Digital Solutions for the Future', template: '%s · ASPR Global Tech' },
  description: DESCRIPTION,
  keywords: ['software development company', 'website development', 'app development', 'SaaS development', 'AI chatbot development', 'game development', 'logo design', 'SEO services', 'offshore software development', 'outsource web development', 'dedicated development team', 'US clients', 'worldwide'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', url: '/', siteName: 'ASPR Global Tech', locale: 'en_US',
    title: 'ASPR Global Tech — Build • Brand • Grow', description: DESCRIPTION,
    images: [{ url: '/assets/responsive-web.png', alt: 'Websites and apps built by ASPR Global Tech' }],
  },
  twitter: { card: 'summary_large_image', title: 'ASPR Global Tech — Build • Brand • Grow', description: DESCRIPTION, images: ['/assets/responsive-web.png'] },
  robots: { index: true, follow: true },
  // Tab and home-screen icons come from app/icon.png, app/apple-icon.png and app/favicon.ico.
};

const ORG_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'ASPR Global Tech',
  url: SITE_URL,
  logo: `${SITE_URL}/assets/aspr-logo.png`,
  description: DESCRIPTION,
  email: 'support@asprglobaltech.com',
  telephone: '+91 75399 07704',
  foundingDate: '2026-03',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '12D, 1444C, 27/1, S M Nagar, Perumal Gounder Layout, Mahadevapuram',
    addressLocality: 'Mettupalayam', addressRegion: 'Tamil Nadu', postalCode: '641305', addressCountry: 'IN',
  },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:30', closes: '18:30' }],
  areaServed: 'Worldwide',
  sameAs: ['https://www.instagram.com/aspr_globaltech/', 'https://www.facebook.com/profile.php?id=61593394312825', 'https://wa.me/917539907704'],
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300,0,0&display=block" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }} />
        {children}
      </body>
    </html>
  );
}
