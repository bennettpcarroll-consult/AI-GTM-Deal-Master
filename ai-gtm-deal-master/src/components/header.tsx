'use client';

import Link from 'next/link';
import { setActiveTrajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { trajectoryLabel } from '@/lib/views';

/** `workspace` strikes through "Pilot" once the learner is inside the active workspace. */
export function Header({ workspace = false }: { workspace?: boolean }) {
  const { state, update } = useAppState();

  return (
    <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2 text-lg font-extrabold tracking-tight text-[#111827]">
          <span>Profit, Not</span>
          {workspace ? <s className="text-[#EF4444]">Pilot</s> : <span className="text-[#64748B]">Pilot</span>}
        </Link>
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B] md:block">AI GTM: Deal Master</p>
        <div className="flex items-center gap-2">
          {state && state.trajectories.length > 0 && (
            <select
              aria-label="Active trajectory"
              value={state.activeTrajectoryId ?? ''}
              onChange={(event) => update((current) => setActiveTrajectory(current, event.target.value))}
              className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
            >
              {state.trajectories.map((trajectory) => (
                <option key={trajectory.id} value={trajectory.id}>
                  {trajectoryLabel(trajectory)}
                </option>
              ))}
            </select>
          )}
          <Link
            href="/settings"
            className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F8FAFC]"
          >
            Settings
          </Link>
        </div>
      </div>
    </header>
  );
}
