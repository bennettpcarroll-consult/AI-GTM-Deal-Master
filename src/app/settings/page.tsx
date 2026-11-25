'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { TopBar } from '@/components/top-bar';
import { CREDIT_THRESHOLD } from '@/lib/constants';
import { bossesPassed, emptyAppState, resetTrajectory, setActiveTrajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { trajectoryLabel } from '@/lib/views';

export default function SettingsPage() {
  const { state, update } = useAppState();

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-xl space-y-4 px-4 pb-16 pt-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">Settings</h1>
          <p className="mt-1 text-sm text-[#64748B]">Switching or adding a trajectory never changes the progress in the others.</p>
        </div>

        {!state ? (
          <p className="text-sm text-[#64748B]">Loading…</p>
        ) : (
          <>
            <Link href="/new" className="cta w-full">
              <Plus className="h-5 w-5" strokeWidth={2} aria-hidden="true" /> Add a Trajectory
            </Link>

            <section className="card divide-y divide-[#E5E7EB]" aria-label="Your trajectories">
              {state.trajectories.length === 0 && <p className="p-5 text-sm text-[#64748B]">No trajectories yet.</p>}
              {state.trajectories.map((trajectory) => {
                const isActive = trajectory.id === state.activeTrajectoryId;
                return (
                  <div key={trajectory.id} className="space-y-3 p-5">
                    <div>
                      <p className="font-bold text-[#111827]">
                        {trajectoryLabel(trajectory)}
                        {isActive && <span className="ml-2 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-sm font-semibold text-[#047857]">Active</span>}
                      </p>
                      <p className="text-sm text-[#64748B]">
                        {bossesPassed(trajectory)} of 4 units complete · {trajectory.sessions.length} {trajectory.sessions.length === 1 ? 'session' : 'sessions'} recorded
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => update((current) => setActiveTrajectory(current, trajectory.id))}
                          className="rounded-xl border border-[#111827] px-4 py-2 text-sm font-bold text-[#111827] hover:bg-[#F8FAFC]"
                        >
                          Make active
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Reset progress for ${trajectoryLabel(trajectory)}? Other trajectories are not affected.`)) {
                            update((current) => resetTrajectory(current, trajectory.id));
                          }
                        }}
                        className="rounded-xl border border-[#FECACA] px-4 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]"
                      >
                        Reset progress
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="card p-5">
              <h2 className="text-lg font-extrabold text-[#111827]">Global competencies</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Best verified MEDDPICC score across all trajectories:{' '}
                <span className="font-bold text-[#111827]">{state.globalCompetencies.meddpicc}%</span>. At {CREDIT_THRESHOLD}% or higher, new
                trajectories skip the introductory discovery drill with placement credit.
              </p>
            </section>

            <section className="card p-5">
              <h2 className="text-lg font-extrabold text-[#111827]">Local data</h2>
              <p className="mt-1 text-sm text-[#64748B]">Progress is stored in this browser only. Clearing it cannot be undone.</p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete all local progress for every trajectory?')) update(() => emptyAppState());
                }}
                className="mt-4 rounded-xl border border-[#FECACA] px-4 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]"
              >
                Clear all local data
              </button>
            </section>
          </>
        )}
      </main>
    </>
  );
}
