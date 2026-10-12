// Privacy-friendly event tracking. Sends nothing unless Plausible is configured
// (NEXT_PUBLIC_PLAUSIBLE_DOMAIN). No cookies, no personal data in event properties.

export type AnalyticsEvent = 'CTA Click' | 'Quote Submitted' | 'Contact Submitted' | 'Portfolio View' | 'Service View' | 'Application Submitted';

declare global {
  interface Window { plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void }
}

export function track(event: AnalyticsEvent, props?: Record<string, string | number>): void {
  if (typeof window === 'undefined') return;
  try { window.plausible?.(event, props ? { props } : undefined); } catch { /* analytics must never break the page */ }
}
