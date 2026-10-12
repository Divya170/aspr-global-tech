import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, FolderKanban } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import type { ProjectCard } from '@/lib/types';
import '@/components/pages/content/content.css';

/** Project card: cover with a hover tint and light sweep, category chip, title, summary, stack and year. */
export function PortfolioCard({ project, priority = false, large = false }: { project: ProjectCard; priority?: boolean; large?: boolean }) {
  return (
    <SpotlightCard tilt as="article" className="group panel fx-border overflow-hidden">
      <Link href={`/portfolio/${project.slug}`} className="block">
        <div className={`relative overflow-hidden bg-surface-2 ${large ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
          {project.coverImage ? (
            <Image
              src={project.coverImage} alt={project.coverAlt || project.title} fill priority={priority}
              sizes={large ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
              className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
              style={{ objectPosition: project.coverPos || 'center' }}
            />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_80%_70%_at_20%_110%,color-mix(in_srgb,var(--color-brand)_19%,transparent),transparent_60%),radial-gradient(ellipse_60%_60%_at_95%_0%,color-mix(in_srgb,var(--color-accent)_13%,transparent),transparent_60%)]">
              <div className="bg-grid absolute inset-0" />
              <FolderKanban strokeWidth={1} className="relative size-24 text-brand/30 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-rotate-6 group-hover:scale-110" />
            </div>
          )}
          <div aria-hidden="true" className="ct-work-tint" />
          <div aria-hidden="true" className="ct-work-sheen" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
          {project.category && <Badge tone="brand" className="absolute left-4 top-4 backdrop-blur-md">{project.category.name}</Badge>}
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-semibold leading-snug text-text transition-colors group-hover:text-brand sm:text-xl">{project.title}</h3>
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong text-muted transition-all duration-300 group-hover:border-transparent group-hover:bg-brand-strong group-hover:text-white group-hover:shadow-[0_12px_28px_-12px_color-mix(in_srgb,var(--color-brand)_57%,transparent)]">
              <ArrowUpRight aria-hidden="true" size={16} className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:rotate-45" />
            </span>
          </div>
          {project.summary && <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-muted">{project.summary}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {project.technologies.slice(0, 4).map((t) => <Badge key={t.id}>{t.name}</Badge>)}
            {project.year && <span className="ml-auto font-mono text-xs text-subtle">{project.year}</span>}
          </div>
          <span className="sr-only">View project</span>
        </div>
      </Link>
    </SpotlightCard>
  );
}
