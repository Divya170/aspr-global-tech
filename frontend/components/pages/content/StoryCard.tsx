import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import type { ArticleCard } from '@/lib/types';
import { category, catStyle, CategoryChip, CategoryOrbit } from './categories';
import './content.css';

function Meta({ a }: { a: ArticleCard }) {
  return (
    <p className="font-mono text-xs text-subtle">
      {a.publishedAt}{a.readTime && <><span aria-hidden="true"> · </span>{a.readTime}</>}
    </p>
  );
}

/** The newest article as a wide hero card: text on one side, an orbiting category emblem (or the cover) on the other. */
export function FeaturedStory({ a }: { a: ArticleCard }) {
  return (
    <SpotlightCard as="article" className="ct-feature group">
      <Link href={`/insights/${a.slug}`} className="relative grid rounded-[inherit] md:grid-cols-12" style={catStyle(a.category)}>
        <div aria-hidden="true" className="fx-aurora opacity-60"><i /><i /><i /></div>
        <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-70" />
        <div className="relative flex flex-col p-6 sm:p-10 md:col-span-7 lg:p-12">
          {a.category && <CategoryChip name={a.category} className="self-start" />}
          <h2 className="text-heading mt-6 transition-colors duration-300 group-hover:text-white sm:text-[2.6rem] sm:leading-[1.08]">{a.title}</h2>
          {a.standfirst && <p className="text-lead mt-5 line-clamp-4 max-w-xl">{a.standfirst}</p>}
          <div className="mt-auto flex items-center justify-between gap-4 pt-10">
            <Meta a={a} />
            <span className="ct-go size-12!"><ArrowRight aria-hidden="true" size={18} /></span>
          </div>
        </div>
        <div className="ct-feature-art order-first md:order-none md:col-span-5">
          {a.img ? (
            <Image
              src={a.img} alt={a.alt || ''} fill priority sizes="(min-width: 768px) 42vw, 100vw"
              className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
              style={{ objectPosition: a.pos || 'center' }}
            />
          ) : (
            <CategoryOrbit name={a.category} className="my-8 md:my-12" />
          )}
        </div>
      </Link>
    </SpotlightCard>
  );
}

/** Article card for the insights bento: category chip, icon that turns on hover, accent bar and a sliding arrow. */
export function StoryCard({ a, wide = false }: { a: ArticleCard; wide?: boolean }) {
  const { icon: I } = category(a.category);
  return (
    <SpotlightCard as="article" className={`ct-story group ${wide ? 'ct-story--wide' : ''}`}>
      <Link href={`/insights/${a.slug}`} className="relative flex h-full flex-col rounded-[inherit]" style={catStyle(a.category)}>
        <I aria-hidden="true" strokeWidth={1} className="ct-story-mark" />
        {a.img && (
          <div className="relative aspect-[16/9] overflow-hidden border-b border-line bg-surface-2">
            <Image
              src={a.img} alt={a.alt || ''} fill sizes={wide ? '(min-width: 1024px) 66vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw'}
              className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
              style={{ objectPosition: a.pos || 'center' }}
            />
          </div>
        )}
        <div className={`relative flex flex-1 flex-col p-6 sm:p-7 ${wide ? 'lg:p-9' : ''}`}>
          <div className="flex items-center justify-between gap-4">
            {a.category ? <CategoryChip name={a.category} /> : <span />}
            <span aria-hidden="true" className="ct-story-icon"><I size={19} strokeWidth={1.7} /></span>
          </div>
          <h2 className={`mt-6 font-semibold leading-snug text-text ${wide ? 'max-w-2xl text-2xl sm:text-[1.9rem] sm:leading-tight' : 'text-xl'}`}>{a.title}</h2>
          {a.standfirst && <p className={`mt-3 leading-relaxed text-muted ${wide ? 'line-clamp-3 max-w-2xl' : 'line-clamp-3 text-[0.95rem]'}`}>{a.standfirst}</p>}
          <span aria-hidden="true" className="block min-h-7 flex-1" />
          <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
            <Meta a={a} />
            <span className="ct-go"><ArrowRight aria-hidden="true" size={16} /></span>
          </div>
        </div>
      </Link>
    </SpotlightCard>
  );
}
