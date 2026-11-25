'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Header } from '@/components/header';
import { loadCurriculum } from '@/lib/curriculum/load';
import { CLUSTER_IDS, VERTICAL_IDS, type ClusterId, type VerticalId } from '@/lib/curriculum/schema';
import { addOrActivateTrajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { placementCreditKeys, trajectoryLabel } from '@/lib/views';

export default function OnboardingPage() {
  const router = useRouter();
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const [clusterId, setClusterId] = useState<ClusterId | null>(null);
  const [verticalId, setVerticalId] = useState<VerticalId | null>(null);
  const active = state?.trajectories.find((trajectory) => trajectory.id === state.activeTrajectoryId);
  const canStart = clusterId !== null && verticalId !== null;

  const start = () => {
    if (!clusterId || !verticalId) return;
    update((current) => addOrActivateTrajectory(current, clusterId, verticalId, placementCreditKeys(curriculum)));
    router.push('/dashboard');
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12">
        <section className="text-center">
          <span className="inline-block rounded-full bg-[#ECFDF5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#047857]">
            Before we start
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Stop Pitching. <span className="spectrum-text">Start Closing.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#64748B]">
            Choose what you sell and who you sell to. Every simulation is graded on verbatim buyer evidence, not on checkboxes.
          </p>
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[#111827]">1 · Target AI cluster</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {CLUSTER_IDS.map((id) => {
                const cluster = curriculum.clusters[id];
                return (
                  <OptionCard
                    key={id}
                    selected={clusterId === id}
                    onSelect={() => setClusterId(id)}
                    title={cluster.display_name}
                    subtitle={cluster.value_chain_layer}
                    detail={cluster.pricing_unit.model}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[#111827]">2 · Target customer vertical</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {VERTICAL_IDS.map((id) => {
                const vertical = curriculum.verticals[id];
                return (
                  <OptionCard
                    key={id}
                    selected={verticalId === id}
                    onSelect={() => setVerticalId(id)}
                    title={vertical.short_name}
                    subtitle={vertical.display_name}
                    detail={vertical.dominant_friction}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-12 flex flex-col items-center gap-4">
          <button
            type="button"
            disabled={!canStart}
            onClick={start}
            className="spectrum-cta rounded-full px-8 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start trajectory
          </button>
          {active && (
            <Link href="/dashboard" className="text-sm font-semibold text-[#475569] underline-offset-4 hover:underline">
              Continue {trajectoryLabel(active)}
            </Link>
          )}
        </section>
      </main>
    </>
  );
}

function OptionCard({
  selected,
  onSelect,
  title,
  subtitle,
  detail
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="relative rounded-2xl border p-5 text-left transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
      style={{ borderColor: selected ? '#10B981' : '#E5E7EB', background: selected ? '#ECFDF5' : '#FFFFFF' }}
    >
      {selected && (
        <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#10B981] text-white">
          <Check className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <p className="pr-8 font-bold text-[#111827]">{title}</p>
      <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
      <p className="mt-3 text-xs leading-relaxed text-[#94A3B8]">{detail}</p>
    </button>
  );
}
