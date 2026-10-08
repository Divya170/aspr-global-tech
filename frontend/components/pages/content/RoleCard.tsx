import { BriefcaseBusiness, Clapperboard, Code2, GraduationCap, Palette, Plus, Send, Smartphone, Star, Zap, type LucideIcon } from 'lucide-react';
import { ApplicationForm } from '@/components/sections/ApplicationForm';
import { Badge } from '@/components/ui/Badge';
import type { Role } from '@/lib/types';
import './content.css';

const ROLE_ICONS: [RegExp, LucideIcon][] = [
  [/intern/i, GraduationCap], [/\bapp\b/i, Smartphone], [/full stack|developer|engineer/i, Code2], [/graphic|design/i, Palette], [/video/i, Clapperboard],
];
const roleIcon = (title: string) => ROLE_ICONS.find(([re]) => re.test(title))?.[1] || BriefcaseBusiness;

const paragraphs = (text: string) => text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
/** A short "Label:" lead-in, e.g. "What you'll do:". */
const LEAD_IN = /^([^:.\n]{3,32}):\s+([\s\S]*)$/;

/** Role description: paragraphs split on blank lines; a "Label:" paragraph becomes a highlighted point. */
function Description({ text }: { text: string }) {
  return (
    <div className="space-y-4">
      {paragraphs(text).map((para, i) => {
        const m = para.match(LEAD_IN);
        if (!m) return <p key={i} className="text-[1.05rem] leading-relaxed text-text">{para}</p>;
        const I = /look for|need|require|bring/i.test(m[1]) ? Star : Zap;
        return (
          <div key={i} className="ct-point">
            <span aria-hidden="true" className="ct-point-icon"><I size={16} /></span>
            <p className="leading-relaxed text-muted"><strong className="font-semibold text-text">{m[1]}:</strong> {m[2]}</p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * One open role as an expandable card on native <details> (works without JavaScript): icon picked
 * from the title, meta chips and a teaser line; opens with a glowing gradient border into the
 * description and the application form.
 */
export function RoleCard({ role }: { role: Role }) {
  const I = roleIcon(role.title);
  // The teaser repeats the first plain paragraph for sighted users; the full text is in the body.
  const teaser = paragraphs(role.description || '').find((p) => !LEAD_IN.test(p));
  return (
    <details id={`role-${role.id}`} className="ct-role group scroll-mt-28 [&_summary::-webkit-details-marker]:hidden">
      <summary className="ct-role-head">
        <span aria-hidden="true" className="ct-role-icon max-sm:size-12!"><I size={24} strokeWidth={1.7} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold text-text transition-colors group-hover:text-white sm:text-2xl">{role.title}</h3>
          {role.meta.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Role details">
              {role.meta.map((m, j) => <li key={m}><Badge tone={j === 0 ? 'brand' : 'default'}>{m}</Badge></li>)}
            </ul>
          )}
          {teaser && <span aria-hidden="true" className="ct-role-teaser">{teaser}</span>}
        </div>
        <span className="ct-role-cta">
          <span className="hidden sm:inline group-open:hidden">Details & apply</span>
          <span className="hidden sm:group-open:inline">Close</span>
          <span className="ct-role-cta-icon"><Plus aria-hidden="true" size={17} /></span>
        </span>
      </summary>
      <div className="ct-role-body">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {role.description && <div className="max-w-3xl lg:col-span-5"><Description text={role.description} /></div>}
          <div className={`ct-glass ct-apply ${role.description ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="ct-apply-icon"><Send size={18} /></span>
              <div>
                <h4 className="font-display text-lg font-semibold text-text">Apply for {role.title}</h4>
                <p className="mt-1.5 text-sm text-muted">Fields marked * are required.</p>
              </div>
            </div>
            <div className="mt-6"><ApplicationForm roleId={role.id} roleTitle={role.title} /></div>
          </div>
        </div>
      </div>
    </details>
  );
}
