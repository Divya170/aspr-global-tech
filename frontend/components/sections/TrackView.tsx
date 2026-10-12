'use client';

import { useEffect } from 'react';
import { track, type AnalyticsEvent } from '@/lib/analytics';

/** Fires one analytics event when the page mounts. Renders nothing. */
export function TrackView({ event, props }: { event: AnalyticsEvent; props?: Record<string, string | number> }) {
  const key = JSON.stringify(props ?? null);
  useEffect(() => {
    track(event, key === 'null' ? undefined : JSON.parse(key));
  }, [event, key]);
  return null;
}
