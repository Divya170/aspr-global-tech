import {
  Box, DraftingCompass, FlaskConical, GraduationCap, Hammer, Layers, Lightbulb, Map as MapIcon, PackageCheck, Pencil, PenTool, Rocket, ScanSearch, Search,
  SlidersHorizontal, TrendingUp, WandSparkles, type LucideIcon,
} from 'lucide-react';

/** Decorative icons for delivery steps, matched on the step name (CMS text), with a fallback by position. */
const STEP_ICONS: [RegExp, LucideIcon][] = [
  [/research/i, ScanSearch], [/discover/i, Search], [/^map/i, MapIcon], [/concept/i, Lightbulb], [/architect/i, DraftingCompass], [/structure/i, Layers],
  [/sketch/i, Pencil], [/model/i, Box], [/design/i, PenTool], [/build|develop/i, Hammer], [/refine/i, WandSparkles], [/tune/i, SlidersHorizontal],
  [/validate|test/i, FlaskConical], [/train/i, GraduationCap], [/launch|deploy/i, Rocket], [/scale|grow/i, TrendingUp], [/deliver/i, PackageCheck],
];
const FALLBACK: LucideIcon[] = [Search, PenTool, Hammer, Rocket];

export function stepIcon(name: string, i: number, size = 20) {
  const I = STEP_ICONS.find(([re]) => re.test(name))?.[1] ?? FALLBACK[i % FALLBACK.length];
  return <I size={size} strokeWidth={1.7} />;
}

/** Think it / Build it / Scale it. */
const STAGE_ICONS: LucideIcon[] = [Lightbulb, Hammer, TrendingUp];
export function stageIcon(i: number, size = 22) {
  const I = STAGE_ICONS[i % STAGE_ICONS.length];
  return <I size={size} strokeWidth={1.7} />;
}
