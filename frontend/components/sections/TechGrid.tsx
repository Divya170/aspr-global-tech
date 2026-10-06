import { Reveal } from '@/components/ui/Reveal';
import type { Technology } from '@/lib/types';

export const TECH_GROUP_LABELS: Record<string, string> = {
  frontend: 'Frontend', backend: 'Backend', database: 'Database', mobile: 'Mobile', '3d': '3D & WebGL',
  infrastructure: 'Infrastructure', design: 'Design', platforms: 'Platforms',
};
const ORDER = Object.keys(TECH_GROUP_LABELS);

/** Technologies grouped by category, from the admin-managed list. */
export function TechGrid({ technologies, groups }: { technologies: Technology[]; groups?: string[] }) {
  const by = new Map<string, Technology[]>();
  for (const t of technologies) by.set(t.group, [...(by.get(t.group) || []), t]);
  const list = ORDER.filter((g) => by.has(g) && (!groups || groups.includes(g)));
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((g, i) => (
        <Reveal key={g} delay={i * 60} className="panel p-6">
          <h3 className="eyebrow text-subtle!">{TECH_GROUP_LABELS[g]}</h3>
          <ul className="mt-5 flex flex-wrap gap-2">
            {by.get(g)!.map((t) => (
              <li key={t.id} className="rounded-lg border border-line bg-white/[0.02] px-3 py-1.5 text-sm text-text transition-colors hover:border-brand/40 hover:bg-brand/10">{t.name}</li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}
