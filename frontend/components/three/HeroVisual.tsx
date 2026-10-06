'use client';

import { useCallback, useState } from 'react';
import { Hero3D } from './Hero3D';
import { HeroFallback } from './HeroFallback';

/** Static composition first (instant, no JS cost); the 3D scene cross-fades over it when ready. */
export function HeroVisual() {
  const [live, setLive] = useState(false);
  const onReady = useCallback(() => setLive(true), []);
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div className={`absolute inset-0 transition-opacity duration-1000 ${live ? 'opacity-0' : 'opacity-100'}`}>
        <HeroFallback />
      </div>
      <Hero3D onReady={onReady} />
    </div>
  );
}
