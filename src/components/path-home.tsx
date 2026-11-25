'use client';

import Link from 'next/link';
import * as Accordion from '@radix-ui/react-accordion';
import { ArrowRight, Check, ChevronRight, Circle, Lock } from 'lucide-react';
import { UNIT_TINT } from '@/lib/brand';
import { loadCurriculum, signalDefinitions, type Curriculum } from '@/lib/curriculum/load';
import type { Rubric } from '@/lib/curriculum/schema';
import { buildPath, type PathStep, type PathUnit } from '@/lib/path';
import type { Trajectory } from '@/lib/store';
import { trajectoryLabel } from '@/lib/views';
import { UnitIcon } from './unit-icon';

const TEXT_LINK = 'font-semibold text-[#111827] underline underline-offset-4 hover:text-[#047857]';

export function PathHome({ trajectory }: { trajectory: Trajectory }) {
  const curriculum = loadCurriculum();
  const path = buildPath(trajectory, curriculum.rubrics);

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <h1 className="sr-only">Your path: {trajectoryLabel(trajectory)}</h1>

      {!path.activeUnit && (
        <section className="mb-3 rounded-2xl border border-[#10B981] bg-[#ECFDF5] p-5">
          <h2 className="text-lg font-extrabold tracking-tight text-[#111827]">Path complete</h2>
          <p className="mt-1 text-sm text-[#047857]">You passed all four boss fights on this trajectory.</p>
          <Link href="/new" className="cta mt-4 w-full">
            Start a New Trajectory <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </Link>
        </section>
      )}

      <Accordion.Root key={trajectory.id} type="multiple" className="space-y-3">
        {path.units.map((unit) =>
          unit.status === 'active' ? (
            <ActiveUnit key={unit.tier} unit={unit} rubric={curriculum.rubrics[unit.tier]} curriculum={curriculum} />
          ) : (
            <CollapsedUnit key={unit.tier} unit={unit} rubric={curriculum.rubrics[unit.tier]} curriculum={curriculum} />
          )
        )}
      </Accordion.Root>
    </main>
  );
}

function ActiveUnit({ unit, rubric, curriculum }: { unit: PathUnit; rubric: Rubric; curriculum: Curriculum }) {
  const next = unit.steps.find((step) => step.status === 'current');
  const total = unit.steps.length;

  return (
    <section aria-labelledby={`unit-${unit.tier}-title`} className="space-y-2">
      <div className="rounded-2xl border p-5" style={{ background: UNIT_TINT[unit.tier], borderColor: `${rubric.color}66` }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white" style={{ color: rubric.color }}>
            <UnitIcon name={rubric.icon} className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 id={`unit-${unit.tier}-title`} className="text-lg font-extrabold tracking-tight text-[#111827]">
              Unit {unit.tier} · {rubric.role_title}
            </h2>
            <p className="text-sm font-semibold" style={{ color: rubric.text_color }}>
              {unit.completedSteps} of {total} complete
            </p>
          </div>
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-label={`Unit ${unit.tier} progress`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={unit.completedSteps}
        >
          <div className="h-full rounded-full transition-all" style={{ width: `${(unit.completedSteps / total) * 100}%`, background: rubric.color }} />
        </div>
        {next && (
          <Link href={next.href} className="cta mt-4 w-full">
            {next.kind === 'boss' ? 'Start Boss Fight' : 'Continue Next Drill'}
            <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </div>

      <Accordion.Root type="multiple" asChild>
        <ol className="space-y-2">
          {unit.steps.map((step) => {
            if (step.status === 'complete') {
              return (
                <Accordion.Item key={step.id} value={step.id} asChild>
                  <li className="rounded-2xl border border-[#E5E7EB] bg-white">
                    <Accordion.Header>
                      <Accordion.Trigger className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#ECFDF5] text-[#047857]">
                          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                        </span>
                        <span className="flex-1 text-sm font-semibold text-[#111827]">{step.name}</span>
                        <span className="sr-only">Complete</span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-[#64748B] transition-transform group-data-[state=open]:rotate-90"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="border-t border-[#E5E7EB] px-4 py-3">
                      <StepSummary step={step} rubric={rubric} curriculum={curriculum} />
                    </Accordion.Content>
                  </li>
                </Accordion.Item>
              );
            }
            if (step.status === 'current') {
              const gate = step.kind === 'boss' ? rubric.boss_pass_min : rubric.core_gate_pass_min;
              return (
                <li
                  key={step.id}
                  aria-current="step"
                  className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white py-3 pl-3 pr-3 shadow-sm"
                  style={{ borderLeft: `4px solid ${rubric.color}` }}
                >
                  <span className="h-6 w-6 shrink-0 rounded-full border-2" style={{ borderColor: rubric.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-[#111827]">{step.name}</span>
                    {step.bestScore !== null && (
                      <span className="block text-sm text-[#64748B]">
                        Best so far {step.bestScore}%. Pass mark {gate}%.
                      </span>
                    )}
                  </span>
                  <Link
                    href={step.href}
                    className="shrink-0 rounded-xl border border-[#111827] bg-white px-4 py-2 text-sm font-bold text-[#111827] hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
                  >
                    Start
                  </Link>
                </li>
              );
            }
            return (
              <li key={step.id} className="flex items-center gap-3 px-4 py-2 text-sm text-[#64748B]">
                <Circle className="h-6 w-6 shrink-0 p-0.5" strokeWidth={1.5} aria-hidden="true" />
                {step.name}
              </li>
            );
          })}
        </ol>
      </Accordion.Root>
    </section>
  );
}

function StepSummary({ step, rubric, curriculum }: { step: PathStep; rubric: Rubric; curriculum: Curriculum }) {
  const drill = rubric.drills.find((candidate) => candidate.id === step.drillId);
  const labels = signalDefinitions(curriculum);
  const signalNames = drill?.target_signals.map((id) => labels.find((signal) => signal.id === id)?.label ?? id).join(', ');

  return (
    <div className="space-y-1 text-sm text-[#475569]">
      <p>
        {step.credited ? (
          'Placement credit applied from your verified MEDDPICC score.'
        ) : (
          <>
            Best score <span className="font-bold text-[#111827]">{step.bestScore ?? 0}%</span>
          </>
        )}
      </p>
      {signalNames && <p>Signals verified: {signalNames}</p>}
      {step.kind === 'boss' && <p>Artifact: {rubric.artifact}</p>}
      <p className="pt-1">
        <Link href={step.href} className={TEXT_LINK}>
          Practice again
        </Link>
      </p>
    </div>
  );
}

function CollapsedUnit({ unit, rubric, curriculum }: { unit: PathUnit; rubric: Rubric; curriculum: Curriculum }) {
  const locked = unit.status === 'locked';
  const frameworks = [...rubric.frameworks.map((id) => curriculum.frameworks[id]?.display_name ?? id), ...rubric.supporting_frameworks];

  return (
    <Accordion.Item
      value={`unit-${unit.tier}`}
      className={`rounded-2xl border bg-white ${locked ? 'border-dashed border-[#CBD5E1]' : 'border-[#E5E7EB]'}`}
    >
      <Accordion.Header asChild>
        <h2>
          <Accordion.Trigger className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]">
            <ChevronRight
              className="h-4 w-4 shrink-0 text-[#64748B] transition-transform group-data-[state=open]:rotate-90"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className={`flex-1 text-sm font-semibold ${locked ? 'text-[#475569]' : 'text-[#111827]'}`}>
              Unit {unit.tier} · {rubric.role_title}
            </span>
            {locked ? (
              <span className="flex shrink-0 items-center gap-1 text-sm text-[#64748B]">
                <Lock className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /> Locked
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#047857]">
                <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> Complete
              </span>
            )}
          </Accordion.Trigger>
        </h2>
      </Accordion.Header>
      <Accordion.Content className="space-y-3 border-t border-[#E5E7EB] px-4 py-4 text-sm text-[#475569]">
        <div>
          <p className="font-bold text-[#111827]">{rubric.transition_banner.title}</p>
          <p>{rubric.transition_banner.body}</p>
        </div>
        <ol className="space-y-1">
          {unit.steps.map((step) => (
            <li key={step.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span>{step.name}</span>
              {!locked && (
                <span className="flex items-baseline gap-3">
                  {step.bestScore !== null && <span className="tabular-nums">{step.credited ? 'Credited' : `${step.bestScore}%`}</span>}
                  <Link href={step.href} className={TEXT_LINK}>
                    Practice
                  </Link>
                </span>
              )}
            </li>
          ))}
        </ol>
        <dl className="space-y-1">
          <div>
            <dt className="inline font-semibold text-[#111827]">Theme: </dt>
            <dd className="inline">{rubric.pillar_theme}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-[#111827]">Simulated deal size: </dt>
            <dd className="inline">{rubric.acv_band}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-[#111827]">Frameworks: </dt>
            <dd className="inline">{frameworks.join(', ')}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-[#111827]">Artifact: </dt>
            <dd className="inline">{rubric.artifact}</dd>
          </div>
        </dl>
        {locked && <p>Unlocks when you pass the Unit {unit.tier - 1} boss fight.</p>}
      </Accordion.Content>
    </Accordion.Item>
  );
}
