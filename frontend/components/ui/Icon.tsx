import {
  Bot, Box, Clapperboard, Cloud, Code2, Cpu, Database, Gamepad2, Globe, Landmark, Layers, LayoutDashboard, LineChart, Package,
  Palette, PenTool, Receipt, Rocket, Search, ShieldCheck, ShoppingCart, Smartphone, Sparkles, Users, Workflow, Zap, type LucideIcon,
} from 'lucide-react';

/** Icon names stored in the CMS (backend ICONS list) → lucide components. */
const ICONS: Record<string, LucideIcon> = {
  globe: Globe, box: Box, 'layout-dashboard': LayoutDashboard, cpu: Cpu, smartphone: Smartphone, 'pen-tool': PenTool, workflow: Workflow,
  palette: Palette, bot: Bot, 'gamepad-2': Gamepad2, clapperboard: Clapperboard, search: Search, code: Code2, layers: Layers,
  'shopping-cart': ShoppingCart, database: Database, cloud: Cloud, sparkles: Sparkles, receipt: Receipt, users: Users, package: Package,
  landmark: Landmark, 'shield-check': ShieldCheck, rocket: Rocket, zap: Zap, 'line-chart': LineChart,
  // v1 product icon names
  receipt_long: Receipt, groups: Users, inventory_2: Package, account_balance: Landmark,
};

export function Icon({ name, className, size = 22, strokeWidth = 1.6 }: { name: string; className?: string; size?: number; strokeWidth?: number }) {
  const C = ICONS[name] || Sparkles;
  return <C aria-hidden="true" className={className} size={size} strokeWidth={strokeWidth} />;
}
