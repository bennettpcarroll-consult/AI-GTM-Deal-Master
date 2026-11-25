'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BarChart3, Dumbbell, Flame, Home, Settings, Target } from 'lucide-react';
import { currentEngagement, DAILY_GOAL } from '@/lib/engagement';
import type { AppState, Trajectory } from '@/lib/store';
import { trajectoryLabel } from '@/lib/views';

const NAV = [
  { href: '/path', label: 'Path', icon: Home },
  { href: '/skills', label: 'Skills', icon: BarChart3 },
  { href: '/reps', label: 'Reps', icon: Dumbbell },
  { href: '/settings', label: 'Settings', icon: Settings }
] as const;

/** Home layout: stats header, a single content column, and the bottom tab bar. */
export function AppShell({ state, trajectory, children }: { state: AppState; trajectory?: Trajectory; children: ReactNode }) {
  const pathname = usePathname();
  const engagement = currentEngagement(state);
  const goalMet = engagement.repsToday >= DAILY_GOAL;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-hairline bg-paper/95 px-4 py-2.5 backdrop-blur">
        <Link
          href="/settings"
          className="flex min-h-[44px] min-w-0 items-center rounded-full border border-rule-strong px-3.5 text-[13px] font-bold text-ink hover:bg-deep"
        >
          <span className="truncate">{trajectory ? trajectoryLabel(trajectory) : 'Deal Master'}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-4 pr-1">
          <span
            className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums"
            style={{ color: engagement.streak > 0 ? '#b85a24' : '#5e6672' }}
            aria-label={`${engagement.streak} day streak`}
            title="Day streak"
          >
            <Flame className="h-[18px] w-[18px]" aria-hidden="true" fill={goalMet ? 'currentColor' : 'none'} />
            {engagement.streak}
          </span>
          <span
            className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums text-profit-ink"
            aria-label={`${engagement.points} proof points`}
            title="Proof points, earned only from verified buyer evidence"
          >
            <Target className="h-[18px] w-[18px]" aria-hidden="true" />
            {engagement.points}
          </span>
        </div>
      </header>

      <main className="flex-1 px-5 pb-28 pt-5">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper/95 backdrop-blur"
      >
        <div className="mx-auto grid max-w-[560px] grid-cols-4 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5">
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
