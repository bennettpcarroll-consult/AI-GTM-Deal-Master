'use client';

import Link from 'next/link';
import { ArrowRight, Award, BookOpen, Check, ChevronDown, Dumbbell, Flag, GraduationCap, Lightbulb, Lock, Play, ScanSearch } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { PillarIcon } from '@/components/pillar-icon';
import { Loading, ProgressBar } from '@/components/ui';
import { PILLAR_TINT } from '@/lib/brand';
import { loadCurriculum } from '@/lib/curriculum/load';
import type { Tier } from '@/lib/curriculum/schema';
import { currentEngagement, dayKey, DAILY_GOAL } from '@/lib/engagement';
import { pathFor, type PathNode } from '@/lib/path';
import { bossesPassed, tierUnlocked } from '@/lib/store';
import { dueSharpen } from '@/lib/sharpen';
import { useAppState } from '@/lib/use-app-state';

/** Zig-zag offsets so the path reads as a trail, not a list. */
const OFFSETS = ['0px', '64px', '-48px', '24px', '-24px'];

export default function PathPage() {
  const { state } = useAppState();
  const curriculum = loadCurriculum();
  if (!state) return <Loading />;
  const trajectory = state.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);

  if (!trajectory) {
    return (
      <AppShell state={state}>
        <div className="card mt-6 flex flex-col items-start gap-3 p-6">
          <h1 className="t-heading">No path yet</h1>
          <p className="t-body text-slate">Pick what you sell and who you sell to, and your path appears here.</p>
          <Link href="/start" className="btn-lit mt-2">
            Get started
          </Link>
        </div>
      </AppShell>
    );
  }

  const engagement = currentEngagement(state);
  const allNodes = pathFor(curriculum, state, trajectory);
  const goalMet = engagement.repsToday >= DAILY_GOAL;
  const dueMoves = dueSharpen(state, trajectory.id, dayKey()).length;

  return (
    <AppShell state={state} trajectory={trajectory}>
      <section className="card flex items-center gap-4 p-4" aria-label="Daily goal">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="t-item">{goalMet ? 'Daily goal hit.' : 'Daily goal'}</p>
            <p className="t-small font-semibold tabular-nums">
              {Math.min(engagement.repsToday, DAILY_GOAL)} of {DAILY_GOAL} reps
            </p>
          </div>
          {dueMoves > 0 && <p className="t-small text-value-ink">{dueMoves === 1 ? '1 missed move is' : `${dueMoves} missed moves are`} due for a second try.</p>}
          <div className="flex w-full">
            <ProgressBar value={engagement.repsToday} max={DAILY_GOAL} label="Daily goal" color={goalMet ? '#0b9f6e' : '#c77dff'} />
          </div>
        </div>
        <Link href="/reps" className="btn-quiet shrink-0 px-4" aria-label="Do 2-minute reps">
          <Dumbbell className="h-4 w-4" aria-hidden="true" /> 2 min
        </Link>
      </section>

      {!state.diagnostic && (
        <Link href="/placement" className="mt-3 flex min-h-[56px] items-center gap-3 rounded-[20px] border border-hairline px-4 py-3 hover:bg-deep">
          <ScanSearch className="h-5 w-5 shrink-0 text-people-ink" aria-hidden="true" />
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold">Take the 2-minute placement check</span>
            <span className="t-small">Optional. Your daily reps start with your gaps.</span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate" aria-hidden="true" />
        </Link>
      )}

      {allNodes.map(({ tier, pillar, nodes }) => {
        const rubric = curriculum.rubrics[tier];
        const unlocked = tierUnlocked(trajectory, tier);
        const passedSteps = nodes.filter((node) => node.state === 'done').length;
        const pillarCurrent = nodes.find((node) => node.state === 'current');
        const trail = (
          <ol className="mt-6 flex flex-col items-center gap-5">
            {nodes.map((node, index) => (
              <li
                key={node.key}
                className="flex flex-col items-center gap-2"
                style={{ transform: `translateX(${OFFSETS[index] ?? '0px'})` }}
              >
                <PathButton node={node} color={rubric.text_color} tint={PILLAR_TINT[tier as Tier]} />
                <span
                  className={`max-w-[160px] text-center text-[13px] leading-tight ${
                    node.state === 'current' ? 'font-bold text-ink' : node.state === 'locked' ? 'font-semibold text-slate' : 'font-semibold text-charcoal'
                  }`}
                >
                  {node.title}
                </span>
              </li>
            ))}
          </ol>
        );

        if (!unlocked) {
          // Locked pillars stay one line, so the path keeps its focus on the active pillar. Tap to peek.
          return (
            <details key={tier} className="group mt-3 first-of-type:mt-8">
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 rounded-[20px] bg-deep px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper text-slate" aria-hidden="true">
                  <Lock className="h-[18px] w-[18px]" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="t-label">Pillar {rubric.pillar} · {rubric.role_title}</span>
                  <span className="text-[15px] font-bold">{pillar?.stage ?? rubric.transition_banner.title}</span>
                </span>
                <span className="t-small hidden sm:inline">Pass Pillar 0{tier - 1} to unlock</span>
                <ChevronDown className="h-4 w-4 text-slate transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="t-small mt-3 px-1 sm:hidden">Finish the Pillar 0{tier - 1} drills to unlock.</p>
              {trail}
            </details>
          );
        }

        return (
          <section key={tier} className="mt-8" aria-labelledby={`pillar-${tier}`}>
            <div className="flex items-center gap-4 rounded-[20px] p-4" style={{ background: PILLAR_TINT[tier as Tier] }}>
              <div className="flex flex-1 flex-col gap-1">
                <p className="t-label" style={{ color: rubric.text_color }}>
                  Pillar {rubric.pillar} · {rubric.role_title}
                </p>
                <h2 id={`pillar-${tier}`} className="t-heading">
                  {pillar?.stage ?? rubric.transition_banner.title}
                </h2>
                {pillar && <p className="t-small text-charcoal">{pillar.problem}</p>}
                <p className="t-small">
                  {rubric.acv_band} deals · {passedSteps} of {nodes.length} complete
                </p>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center self-start rounded-2xl bg-paper" style={{ color: rubric.text_color }} aria-hidden="true">
                <PillarIcon name={rubric.icon} className="h-6 w-6" />
              </span>
            </div>
            {pillarCurrent && (
              <Link href={pillarCurrent.href} className="btn-lit mt-3">
                {continueLabel(pillarCurrent)} <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}
            {trail}
          </section>
        );
      })}

      <section className="mt-10 flex items-center gap-4 rounded-[20px] border-2 border-dashed border-rule-strong p-5">
        <Award className="h-8 w-8 shrink-0 text-slate" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <p className="t-item">Deal playbook certificate</p>
          <p className="t-small">
            {trajectory.finalReview?.passed ? 'Unlocked. All 4 pillars and the final review complete.' : `Unlocks after all 4 pillars and the final review. ${bossesPassed(trajectory)} of 4 pillars complete.`}
          </p>
        </div>
      </section>
    </AppShell>
  );
}

function continueLabel(node: PathNode): string {
  if (node.kind === 'lesson') return 'Start the market briefing';
  if (node.kind === 'concept') return 'Learn the big idea';
  if (node.kind === 'recap') return 'See your pillar recap';
  if (node.kind === 'review') return 'Take the final review';
  return `Continue: ${node.title}`;
}

function PathButton({ node, color, tint }: { node: PathNode; color: string; tint: string }) {
  const size = node.kind === 'review' ? 'h-[88px] w-[88px] rounded-[28px]' : 'h-[76px] w-[76px] rounded-full';
  const kindLabel = { lesson: 'Lesson', concept: 'Concept', drill: 'Drill', recap: 'Recap', review: 'Final review' }[node.kind];
  const label = `${kindLabel}: ${node.title}, ${node.state === 'current' ? 'start here' : node.state === 'open' ? 'upcoming' : node.state}`;
  const Icon = { lesson: BookOpen, concept: Lightbulb, drill: Play, recap: Flag, review: GraduationCap }[node.kind];

  if (node.state === 'locked') {
    return (
      <span className={`grid place-items-center border-2 border-dashed border-rule-strong bg-deep text-slate ${size}`} role="img" aria-label={label}>
        <Lock className="h-6 w-6" aria-hidden="true" />
      </span>
    );
  }
  if (node.state === 'done') {
    return (
      <Link
        href={node.href}
        aria-label={`${label}, practice again`}
        className={`grid place-items-center bg-profit text-white shadow-[0_5px_0_#08734f] transition active:translate-y-[3px] active:shadow-[0_2px_0_#08734f] ${size}`}
      >
        <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
      </Link>
    );
  }
  const isCurrent = node.state === 'current';
  if (!isCurrent) {
    // Upcoming: open to play, but visually quieter than the one drill the learner should do next.
    return (
      <Link
        href={node.href}
        aria-label={label}
        className={`grid place-items-center border-[3px] bg-paper transition active:translate-y-[3px] ${size}`}
        style={{ borderColor: color, color, boxShadow: `0 5px 0 ${tint}` }}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <span className="relative">
      <Link
        href={node.href}
        aria-label={label}
        className={`grid place-items-center text-white transition active:translate-y-[3px] ${size}`}
        style={{
          background: color,
          boxShadow: isCurrent ? `0 5px 0 rgb(14 17 22 / 0.25), 0 0 0 8px ${tint}` : '0 5px 0 rgb(14 17 22 / 0.25)'
        }}
      >
        <Icon className="h-8 w-8" fill="currentColor" aria-hidden="true" />
      </Link>
    </span>
  );
}
