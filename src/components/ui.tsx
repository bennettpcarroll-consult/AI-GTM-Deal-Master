import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
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

/** The four-bar indicator. Solid bars are earned, dashed bars are still open. */
export function Bars({ level, color, label }: { level: Mastery | 1 | 3 | 4; color: string; label: string }) {
  return (
    <span className="flex h-5 items-end gap-[3px]" role="img" aria-label={`${label}, ${level} of 4 bars`}>
      {[6, 10, 14, 20].map((height, index) => {
        const filled = index < level;
        return (
          <span
            key={height}
            className="w-[5px] rounded-[2px]"
            style={
              filled
                ? { height, background: color }
                : { height, border: '1px dashed rgb(14 17 22 / 0.3)', boxSizing: 'border-box' }
            }
          />
        );
      })}
    </span>
  );
}

/** Top row of a focused step: leave or go back, then the step's progress. */
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
