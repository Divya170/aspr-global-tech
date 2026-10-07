'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics';

/** Records one 'Portfolio View' event per project page visit. Renders nothing. */
export function TrackPortfolioView({ slug }: { slug: string }) {
  const sent = useRef('');
  useEffect(() => {
    if (sent.current === slug) return; // guards against Strict Mode's double effect in dev
    sent.current = slug;
    track('Portfolio View', { project: slug });
  }, [slug]);
  return null;
}
