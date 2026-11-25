'use client';

import Link from 'next/link';
import { Header } from '@/components/header';
import { MaturitySpectrum } from '@/components/maturity-spectrum';
import { PillarCard } from '@/components/pillar-card';
import { loadCurriculum } from '@/lib/curriculum/load';
import { TIERS } from '@/lib/curriculum/schema';
import { bossesPassed, tierUnlocked } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { trajectoryLabel } from '@/lib/views';

export default function DashboardPage() {
  const { state } = useAppState();
  const curriculum = loadCurriculum();
  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);

  return (
    <>
      <Header workspace />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {!state ? (
          <p className="text-sm text-[#64748B]">Loading your dashboard…</p>
        ) : !trajectory ? (
          <section className="card mx-auto max-w-lg p-8 text-center">
            <h1 className="text-xl font-extrabold">No trajectory yet</h1>
            <p className="mt-2 text-sm text-[#64748B]">Choose a cluster and a vertical to start your first trajectory.</p>
            <Link href="/" className="spectrum-cta mt-5 inline-block rounded-full px-6 py-2 text-sm font-bold text-white">
              Choose a trajectory
            </Link>
          </section>
        ) : (
          <>
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Active trajectory</p>
              <h1 className="text-3xl font-extrabold tracking-tight">{trajectoryLabel(trajectory)}</h1>
              <p className="mt-1 text-sm text-[#64748B]">
                {bossesPassed(trajectory)} of 4 boss fights passed. Each pillar unlocks when the one before it is passed.
              </p>
            </section>

            <MaturitySpectrum trajectory={trajectory} rubrics={curriculum.rubrics} />

            <nav aria-label="Pillar stepper" className="card flex flex-wrap items-center gap-2 p-3">
              {TIERS.map((tier) => {
                const rubric = curriculum.rubrics[tier];
                const unlocked = tierUnlocked(trajectory, tier);
                return (
                  <a
                    key={tier}
                    href={`#pillar-${tier}`}
                    className="rounded-full border px-4 py-2 text-sm font-semibold"
                    style={{ borderColor: unlocked ? rubric.color : '#E5E7EB', color: unlocked ? rubric.text_color : '#94A3B8' }}
                  >
                    {rubric.pillar} {rubric.role_title}
                  </a>
                );
              })}
              <span className="rounded-full border border-dashed border-[#CBD5E1] px-4 py-2 text-sm text-[#94A3B8]">
                05 · Playbook and certification
              </span>
            </nav>

            <div className="space-y-6">
              {TIERS.map((tier) => (
                <PillarCard key={tier} rubric={curriculum.rubrics[tier]} trajectory={trajectory} />
              ))}
            </div>

            <section className="rounded-[20px] border-2 border-dashed border-[#CBD5E1] bg-white/60 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">05 · Certification</p>
              <h2 className="text-xl font-extrabold">Your deal playbook</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {bossesPassed(trajectory) === 4
                  ? 'Unlocked. You have passed every boss fight in this trajectory.'
                  : `Unlocks after all four boss fights. ${bossesPassed(trajectory)} of 4 passed.`}
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}
