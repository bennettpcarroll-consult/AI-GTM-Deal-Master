import {
  Bot,
  Briefcase,
  Compass,
  Cpu,
  Database,
  Gauge,
  Landmark,
  Scale,
  ShoppingBag,
  Sparkles,
  Target,
  Umbrella,
  Workflow,
  ChartLine,
  Wallet,
  ListChecks,
  Route,
  PenLine,
  Flame,
  UserCheck,
  Swords,
  type LucideIcon
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { GlyphId, SignalId } from '@/lib/curriculum/schema';

const GLYPHS: Record<GlyphId, LucideIcon> = {
  cpu: Cpu,
  sparkles: Sparkles,
  database: Database,
  workflow: Workflow,
  bot: Bot,
  landmark: Landmark,
  'shopping-bag': ShoppingBag,
  umbrella: Umbrella,
  scale: Scale,
  compass: Compass,
  target: Target,
  gauge: Gauge,
  briefcase: Briefcase
};

export function Glyph({ name, className = 'h-5 w-5' }: { name: GlyphId; className?: string }) {
  const Icon = GLYPHS[name];
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}

/** A soft rounded tile holding a glyph or icon. The standard way to put a symbol next to text. */
export function IconTile({
  children,
  tint,
  color,
  size = 'md'
}: {
  children: React.ReactNode;
  tint: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box = size === 'lg' ? 'h-16 w-16 rounded-[20px]' : size === 'sm' ? 'h-9 w-9 rounded-xl' : 'h-12 w-12 rounded-2xl';
  const style: CSSProperties = { background: tint, color };
  return (
    <span className={`grid shrink-0 place-items-center ${box}`} style={style} aria-hidden="true">
      {children}
    </span>
  );
}

const SIGNAL_ICONS: Record<SignalId, LucideIcon> = {
  metrics: ChartLine,
  economic_buyer: Wallet,
  decision_criteria: ListChecks,
  decision_process: Route,
  paper_process: PenLine,
  identify_pain: Flame,
  champion: UserCheck,
  competition: Swords
};

export function SignalIcon({ signal, className = 'h-5 w-5' }: { signal: SignalId; className?: string }) {
  const Icon = SIGNAL_ICONS[signal];
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}
