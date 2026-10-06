import Image from 'next/image';
import { Star } from 'lucide-react';
import type { Testimonial } from '@/lib/types';

export function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="panel flex h-full flex-col p-7">
      {t.rating && (
        <div className="mb-5 flex gap-0.5" role="img" aria-label={`Rated ${t.rating} out of 5`}>
          {Array.from({ length: 5 }, (_, i) => <Star key={i} aria-hidden="true" size={15} className={i < t.rating! ? 'fill-warning text-warning' : 'text-line-strong'} />)}
        </div>
      )}
      <blockquote className="flex-1 text-lg leading-relaxed text-text">“{t.body}”</blockquote>
      <figcaption className="mt-7 flex items-center gap-3">
        {t.image && <Image src={t.image} alt="" width={44} height={44} className="size-11 rounded-full object-cover" />}
        <div>
          <div className="font-medium text-text">{t.clientName}</div>
          {(t.position || t.company) && <div className="text-sm text-subtle">{[t.position, t.company].filter(Boolean).join(', ')}</div>}
        </div>
      </figcaption>
    </figure>
  );
}
