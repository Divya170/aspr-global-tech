import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';
import './effects.css';

// Main's identity font, used for both display and body text.
// Variable font: one file covers every weight used (400–800).
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} | Websites, 3D Experiences & Custom Software`, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US', url: '/', title: SITE_NAME, description: DEFAULT_DESCRIPTION },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: DEFAULT_DESCRIPTION },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f5f7fb', colorScheme: 'light' };

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.tagged-events.js';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') || undefined;
  return (
    <html lang="en" className={`${jakarta.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        {children}
        {PLAUSIBLE_DOMAIN && (
          <>
            <Script id="plausible-init" nonce={nonce} strategy="afterInteractive">
              {'window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments) }'}
            </Script>
            <Script src={PLAUSIBLE_SRC} data-domain={PLAUSIBLE_DOMAIN} nonce={nonce} strategy="afterInteractive" />
          </>
        )}
      </body>
    </html>
  );
}
