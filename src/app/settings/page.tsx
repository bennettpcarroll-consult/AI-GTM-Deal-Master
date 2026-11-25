'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { CLUSTER_IDS, VERTICAL_IDS, type ClusterId, type VerticalId } from '@/lib/curriculum/schema';
import { loadCurriculum } from '@/lib/curriculum/load';
import { addOrActivateTrajectory, bossesPassed, emptyAppState, resetTrajectory, setActiveTrajectory } from '@/lib/store';
import { placementCreditKeys, trajectoryLabel } from '@/lib/views';
import { useAppState } from '@/lib/use-app-state';
import { CREDIT_THRESHOLD } from '@/lib/constants';

export default function SettingsPage() {
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const [clusterId, setClusterId] = useState<ClusterId>(CLUSTER_IDS[0]);
  const [verticalId, setVerticalId] = useState<VerticalId>(VERTICAL_IDS[0]);

  return (
    <>
      <Header workspace />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">User settings</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Trajectories</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Switching or adding a trajectory never changes the progress in the others.
          </p>
        </div>

        {!state ? (
          <p className="text-sm text-[#64748B]">Loading…</p>
        ) : (
          <>
            <section className="card divide-y divide-[#E5E7EB]" aria-label="Saved trajectories">
              {state.trajectories.length === 0 && <p className="p-6 text-sm text-[#64748B]">No trajectories yet.</p>}
              {state.trajectories.map((trajectory) => {
                const isActive = trajectory.id === state.activeTrajectoryId;
                return (
                  <div key={trajectory.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-bold">
                        {trajectoryLabel(trajectory)}
                        {isActive && <span className="ml-2 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] text-[#047857]">Active</span>}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {bossesPassed(trajectory)} of 4 boss fights passed · {trajectory.sessions.length} sessions recorded
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => update((current) => setActiveTrajectory(current, trajectory.id))}
                          className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold hover:bg-[#F8FAFC]"
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
                        className="rounded-full border border-[#FECACA] px-4 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]"
                      >
                        Reset progress
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="card space-y-4 p-6" aria-label="Add trajectory">
              <h2 className="text-lg font-extrabold">Add trajectory</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-semibold">
                  AI cluster
                  <select
                    value={clusterId}
                    onChange={(event) => setClusterId(event.target.value as ClusterId)}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 font-normal"
                  >
                    {CLUSTER_IDS.map((id) => (
                      <option key={id} value={id}>
                        {curriculum.clusters[id].display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-semibold">
                  Customer vertical
                  <select
                    value={verticalId}
                    onChange={(event) => setVerticalId(event.target.value as VerticalId)}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 font-normal"
                  >
                    {VERTICAL_IDS.map((id) => (
                      <option key={id} value={id}>
                        {curriculum.verticals[id].display_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={() => update((current) => addOrActivateTrajectory(current, clusterId, verticalId, placementCreditKeys(curriculum)))}
                className="spectrum-cta rounded-full px-6 py-2 text-sm font-bold text-white"
              >
                Add and activate
              </button>
            </section>

            <section className="card p-6">
              <h2 className="text-lg font-extrabold">Global competencies</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Best verified MEDDPICC score across all trajectories:{' '}
                <span className="font-bold text-[#111827]">{state.globalCompetencies.meddpicc}%</span>. At {CREDIT_THRESHOLD}% or higher,
                new trajectories skip the introductory discovery drill with placement credit.
              </p>
            </section>

            <section className="card p-6">
              <h2 className="text-lg font-extrabold">Local data</h2>
              <p className="mt-1 text-sm text-[#64748B]">Progress is stored in this browser only. Clearing it cannot be undone.</p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete all local progress for every trajectory?')) update(() => emptyAppState());
                }}
                className="mt-4 rounded-full border border-[#FECACA] px-4 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]"
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
