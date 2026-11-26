'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BarChart3, Check, ChevronDown, Dumbbell, Flame, Home, Plus, Settings, Target } from 'lucide-react';
import { currentEngagement, DAILY_GOAL } from '@/lib/engagement';
import { setActiveTrajectory, type AppState, type Trajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { trajectoryLabel } from '@/lib/views';

const NAV = [
  { href: '/path', label: 'Path', icon: Home },
  { href: '/skills', label: 'Skills', icon: BarChart3 },
  { href: '/reps', label: 'Reps', icon: Dumbbell },
  { href: '/settings', label: 'Settings', icon: Settings }
] as const;

type Panel = 'trajectory' | 'streak' | 'points' | null;

/** Home layout: stats header, a single content column, and the bottom tab bar, all in one column. */
export function AppShell({ state, trajectory, children }: { state: AppState; trajectory?: Trajectory; children: ReactNode }) {
  const pathname = usePathname();
  const { update } = useAppState();
  const engagement = currentEngagement(state);
  const goalMet = engagement.repsToday >= DAILY_GOAL;
  const [open, setOpen] = useState<Panel>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !headerRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const toggle = (panel: Panel) => setOpen((current) => (current === panel ? null : panel));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col">
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-hairline bg-paper/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          {trajectory ? (
            <button
              type="button"
              onClick={() => toggle('trajectory')}
              aria-expanded={open === 'trajectory'}
              aria-haspopup="true"
              className="flex min-h-[44px] min-w-0 items-center gap-1.5 rounded-full border border-rule-strong px-3.5 text-[13px] font-bold text-ink hover:bg-deep"
            >
              <span className="truncate">{trajectoryLabel(trajectory)}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate transition ${open === 'trajectory' ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          ) : (
            <span className="px-1 font-display text-[17px] font-extrabold">Deal Master</span>
          )}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => toggle('streak')}
              aria-expanded={open === 'streak'}
              aria-label={`${engagement.streak} day streak`}
              title="Day streak"
              className="flex min-h-[44px] items-center gap-1.5 rounded-full px-2.5 text-[15px] font-bold tabular-nums hover:bg-deep"
              style={{ color: engagement.streak > 0 ? '#b85a24' : '#5e6672' }}
            >
              <Flame className="h-[18px] w-[18px]" aria-hidden="true" fill={goalMet ? 'currentColor' : 'none'} />
              {engagement.streak}
            </button>
            <button
              type="button"
              onClick={() => toggle('points')}
              aria-expanded={open === 'points'}
              aria-label={`${engagement.points} proof points`}
              title="Proof points"
              className="flex min-h-[44px] items-center gap-1.5 rounded-full px-2.5 text-[15px] font-bold tabular-nums text-profit-ink hover:bg-deep"
            >
              <Target className="h-[18px] w-[18px]" aria-hidden="true" />
              {engagement.points}
            </button>
          </div>
        </div>

        {open === 'trajectory' && (
          <div className="absolute inset-x-4 top-full mt-2 animate-rise rounded-panel border border-hairline bg-paper p-2 shadow-float" role="menu">
            <p className="t-label px-3 pb-1 pt-2">Switch path</p>
            {state.trajectories.map((candidate) => {
              const active = candidate.id === state.activeTrajectoryId;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    if (!active) update((current) => setActiveTrajectory(current, candidate.id));
                    setOpen(null);
                  }}
                  className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] hover:bg-deep ${active ? 'font-bold' : 'font-semibold'}`}
                >
                  <span className="flex-1">{trajectoryLabel(candidate)}</span>
                  {active && <Check className="h-4 w-4 text-profit-ink" strokeWidth={3} aria-hidden="true" />}
                </button>
              );
            })}
            <Link href="/start" role="menuitem" className="mt-1 flex min-h-[48px] items-center gap-3 rounded-xl border-t border-rule px-3 text-[15px] font-semibold text-people-ink hover:bg-deep">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add a path
            </Link>
          </div>
        )}
        {(open === 'streak' || open === 'points') && (
          <div className="absolute right-4 top-full mt-2 w-[min(300px,calc(100%-2rem))] animate-rise rounded-panel border border-hairline bg-paper p-4 shadow-float" role="status">
            {open === 'streak' ? (
              <>
                <p className="t-item flex items-center gap-2 text-value-ink">
                  <Flame className="h-4 w-4" aria-hidden="true" /> {engagement.streak}-day streak
                </p>
                <p className="t-small mt-1">Practice on consecutive days to keep it. Today: {Math.min(engagement.repsToday, DAILY_GOAL)} of {DAILY_GOAL} reps.</p>
              </>
            ) : (
              <>
                <p className="t-item flex items-center gap-2 text-profit-ink">
                  <Target className="h-4 w-4" aria-hidden="true" /> {engagement.points} proof points
                </p>
                <p className="t-small mt-1">Ten points each time a buyer confirms a signal in their own words. Nothing else earns them.</p>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 px-5 pb-28 pt-5">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[560px] border-t border-hairline bg-paper/95 backdrop-blur sm:rounded-t-2xl sm:border-x"
      >
        <div className="grid grid-cols-4 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-panel text-[12px] ${
                  active ? 'font-bold text-people-ink' : 'font-semibold text-slate hover:text-ink'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
