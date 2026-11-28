'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Loading } from '@/components/ui';
import { CREDIT_THRESHOLD } from '@/lib/constants';
import { bossesPassed, emptyAppState, resetTrajectory, setActiveTrajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { plural, trajectoryLabel } from '@/lib/views';

export default function SettingsPage() {
  const { state, update } = useAppState();
  if (!state) return <Loading />;
  const active = state.trajectories.find((trajectory) => trajectory.id === state.activeTrajectoryId);

  return (
    <AppShell state={state} trajectory={active}>
      <div className="flex flex-col gap-2">
        <p className="t-label">Settings</p>
        <h1 className="t-title">Your paths</h1>
        <p className="t-lede">Each pairs what you sell with who you sell to. Switching never changes progress in the others.</p>
      </div>

      <section className="card mt-6 divide-y divide-hairline" aria-label="Saved paths">
        {state.trajectories.length === 0 && <p className="t-body p-5 text-slate">No paths yet.</p>}
        {state.trajectories.map((trajectory) => {
          const isActive = trajectory.id === state.activeTrajectoryId;
          return (
            <div key={trajectory.id} className="flex flex-col gap-3 p-5">
              <div className="flex flex-col gap-0.5">
                <p className="t-item">
                  {trajectoryLabel(trajectory)}
                  {isActive && <span className="ml-2 rounded-full bg-profit-soft px-2 py-0.5 text-[12px] text-profit-ink">Active</span>}
                </p>
                <p className="t-small">
                  {bossesPassed(trajectory)} of 4 pillars complete · {plural(trajectory.sessions.length, 'session')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isActive && (
                  <button type="button" className="btn-quiet" onClick={() => update((current) => setActiveTrajectory(current, trajectory.id))}>
                    Make active
                  </button>
                )}
                <button
                  type="button"
                  className="btn-quiet text-leak-ink"
                  onClick={() => {
                    if (window.confirm(`Reset progress for ${trajectoryLabel(trajectory)}? Other paths are not affected.`)) {
                      update((current) => resetTrajectory(current, trajectory.id));
                    }
                  }}
                >
                  Reset progress
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <Link href="/start" className="btn-quiet mt-4 w-full">
        <Plus className="h-4 w-4" aria-hidden="true" /> Add a path
      </Link>

      <section className="card mt-6 flex flex-col gap-2 p-5">
        <h2 className="t-heading">Transferable MEDDPICC score</h2>
        <p className="t-body text-slate">
          Your best verified score across all paths is <span className="font-bold text-ink">{state.globalCompetencies.meddpicc}%</span>. At{' '}
          {CREDIT_THRESHOLD}% or higher, new paths give placement credit on the first drill.
        </p>
      </section>

      <section className="card mt-4 flex flex-col items-start gap-3 p-5">
        <h2 className="t-heading">Data on this device</h2>
        <p className="t-body text-slate">Progress is stored in this browser only. Clearing it cannot be undone.</p>
        <button
          type="button"
          className="btn-quiet text-leak-ink"
          onClick={() => {
            if (window.confirm('Delete all progress on this device, including your streak?')) update(() => emptyAppState());
          }}
        >
          Clear all data
        </button>
      </section>
    </AppShell>
  );
}
