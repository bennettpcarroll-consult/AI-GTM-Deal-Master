import Link from 'next/link';
import type { ReactNode } from 'react';
import { Award, ChevronLeft, Circle, CircleCheck, CircleDot, X } from 'lucide-react';
import type { Mastery } from '@/lib/skills';

/** A rounded progress track. Progress and steps are people violet by default. */
export function ProgressBar({ value, max, label, color = '#c77dff' }: { value: number; max: number; label: string; color?: string }) {
  const percent = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      className="h-2.5 flex-1 overflow-hidden rounded-full bg-deep"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}

const MASTERY_STYLE = {
  1: { label: 'Not started', icon: Circle, className: 'bg-deep text-slate' },
  2: { label: 'Practiced', icon: CircleDot, className: 'bg-people-soft text-people-ink' },
  3: { label: 'Proven', icon: CircleCheck, className: 'bg-profit-soft text-profit-ink' },
  4: { label: 'Certified', icon: Award, className: 'bg-value-soft text-value-ink' }
} as const;

/** Skill mastery as a word plus a symbol. Replaces bar meters, which read as an unexplained gauge. */
export function MasteryBadge({ level }: { level: Mastery }) {
  const style = MASTERY_STYLE[level];
  const Icon = style.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${style.className}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
      {style.label}
    </span>
  );
}

/** A signal's live state in the room: open, partial (buyer hinted) or verified (buyer said it). */
export function SignalState({ bars, label }: { bars: number; label: string }) {
  const verified = bars === 4;
  const partial = bars === 3;
  const Icon = verified ? CircleCheck : partial ? CircleDot : Circle;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${verified ? 'text-profit-ink' : partial ? 'text-ink' : 'text-slate'}`}>
      <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
      {label}
      <span className="sr-only">{verified ? ', verified' : partial ? ', partial' : ', open'}</span>
    </span>
  );
}

export function StepBar({
  exitHref,
  onBack,
  value,
  max,
  label,
  right
}: {
  exitHref?: string;
  onBack?: () => void;
  value: number;
  max: number;
  label: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex h-11 items-center gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className="-ml-2.5 grid h-11 w-11 place-items-center rounded-full text-slate hover:bg-deep">
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
      ) : exitHref ? (
        <Link href={exitHref} aria-label="Close" className="-ml-2.5 grid h-11 w-11 place-items-center rounded-full text-slate hover:bg-deep">
          <X className="h-6 w-6" aria-hidden="true" />
        </Link>
      ) : (
        <span className="w-2" />
      )}
      <ProgressBar value={value} max={max} label={label} />
      {right}
    </div>
  );
}

/** A focused single-column screen with the action pinned to the bottom. */
export function FocusScreen({ top, children, footer }: { top: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-6 pt-4">
      {top}
      <div className={`flex flex-1 flex-col ${footer ? 'pb-6' : ''}`}>{children}</div>
      {footer && <div className="sticky bottom-0 -mx-5 bg-paper px-5 pb-1 pt-3 shadow-[0_-20px_20px_-4px_#ffffff]">{footer}</div>}
    </div>
  );
}

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="mx-auto grid min-h-dvh max-w-[560px] place-items-center px-5">
      <p className="t-small">{text}</p>
    </div>
  );
}
