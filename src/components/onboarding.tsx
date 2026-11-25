'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { loadCurriculum } from '@/lib/curriculum/load';
import { CLUSTER_IDS, VERTICAL_IDS, type ClusterId, type VerticalId } from '@/lib/curriculum/schema';
import { addOrActivateTrajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { placementCreditKeys } from '@/lib/views';

/** Two sequential steps: what the learner sells, then who they sell into. */
export function Onboarding({ onDone }: { onDone?: () => void }) {
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const [step, setStep] = useState<1 | 2>(1);
  const [clusterId, setClusterId] = useState<ClusterId | null>(null);
  const [verticalId, setVerticalId] = useState<VerticalId | null>(null);
  const hasPath = (state?.trajectories.length ?? 0) > 0;

  const start = () => {
    if (!clusterId || !verticalId) return;
    update((current) => addOrActivateTrajectory(current, clusterId, verticalId, placementCreditKeys(curriculum)));
    onDone?.();
  };

  return (
    <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
      <div className="flex h-9 items-center gap-3">
        {step === 2 ? (
          <button
            type="button"
            onClick={() => setStep(1)}
            aria-label="Back to step 1"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#111827] hover:bg-[#E5E7EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        ) : hasPath ? (
          <Link
            href="/"
            aria-label="Close and go back to your path"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#111827] hover:bg-[#E5E7EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        ) : null}
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={step}
        >
          <div className="h-full rounded-full bg-[#111827] transition-all" style={{ width: step === 1 ? '50%' : '100%' }} />
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[#64748B]">{step} / 2</span>
      </div>

      {step === 1 ? (
        <>
          <h1 className="mt-8 text-2xl font-extrabold tracking-tight text-[#111827]">What are you selling?</h1>
          <div className="mt-5 space-y-2">
            {CLUSTER_IDS.map((id) => {
              const cluster = curriculum.clusters[id];
              return (
                <OptionRow
                  key={id}
                  selected={clusterId === id}
                  onSelect={() => setClusterId(id)}
                  title={cluster.display_name}
                  line={cluster.pricing_unit.model}
                />
              );
            })}
          </div>
          <button type="button" disabled={clusterId === null} onClick={() => setStep(2)} className="cta mt-6 w-full">
            Continue <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-2xl font-extrabold tracking-tight text-[#111827]">Who are you selling into?</h1>
          <div className="mt-5 space-y-2">
            {VERTICAL_IDS.map((id) => {
              const vertical = curriculum.verticals[id];
              return (
                <OptionRow
                  key={id}
                  selected={verticalId === id}
                  onSelect={() => setVerticalId(id)}
                  title={vertical.short_name}
                  line={vertical.dominant_friction}
                />
              );
            })}
          </div>
          <button type="button" disabled={verticalId === null} onClick={start} className="cta mt-6 w-full">
            Start Path <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </>
      )}
    </main>
  );
}

function OptionRow({ selected, onSelect, title, line }: { selected: boolean; onSelect: () => void; title: string; line: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] ${
        selected ? 'border-[#111827] ring-1 ring-[#111827]' : 'border-[#E5E7EB] hover:bg-[#F8FAFC]'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-[#111827]">{title}</span>
        <span className="block text-sm text-[#64748B]">{line}</span>
      </span>
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
          selected ? 'border-[#111827] bg-[#111827] text-white' : 'border-[#CBD5E1] text-transparent'
        }`}
        aria-hidden="true"
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    </button>
  );
}
