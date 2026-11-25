'use client';

import Link from 'next/link';
import { Award, Check, Crown, Dumbbell, Lock, Play } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { PillarIcon } from '@/components/pillar-icon';
import { Loading, ProgressBar } from '@/components/ui';
import { PILLAR_TINT } from '@/lib/brand';
import { loadCurriculum } from '@/lib/curriculum/load';
import { TIERS, type Rubric, type Tier } from '@/lib/curriculum/schema';
import { currentEngagement, DAILY_GOAL } from '@/lib/engagement';
import { bossesPassed, drillKey, drillsPassed, tierUnlocked, type Trajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';

type NodeState = 'done' | 'current' | 'open' | 'locked';

interface PathNode {
  key: string;
  href: string;
  title: string;
  kind: 'drill' | 'boss';
  state: NodeState;
}

function nodesFor(trajectory: Trajectory, rubric: Rubric): PathNode[] {
  const tier = rubric.tier;
  const unlocked = tierUnlocked(trajectory, tier);
  const drills: PathNode[] = rubric.drills.map((drill, index) => ({
    key: drill.id,
    href: `/room/${tier}/drill-${index + 1}`,
    title: drill.title,
    kind: 'drill',
    state: !unlocked ? 'locked' : trajectory.drills[drillKey(tier, drill.id)]?.passed ? 'done' : 'open'
  }));
  const allDrills = drillsPassed(trajectory, tier) === rubric.drills.length;
  const boss: PathNode = {
    key: 'boss',
    href: `/room/${tier}/boss`,
    title: rubric.boss_fight.title.replace(/^Boss fight · /, ''),
    kind: 'boss',
    state: !unlocked ? 'locked' : trajectory.boss[String(tier)]?.passed ? 'done' : allDrills ? 'open' : 'locked'
  };
  return [...drills, boss];
}

/** Zig-zag offsets so the path reads as a trail, not a list. */
const OFFSETS = ['0px', '64px', '-48px', '24px'];

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
  const allNodes = TIERS.map((tier) => ({ tier, nodes: nodesFor(trajectory, curriculum.rubrics[tier]) }));
  const current = allNodes.flatMap(({ nodes }) => nodes).find((node) => node.state === 'open');
  if (current) current.state = 'current';
  const goalMet = engagement.repsToday >= DAILY_GOAL;

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
          <ProgressBar value={engagement.repsToday} max={DAILY_GOAL} label="Daily goal" color={goalMet ? '#0b9f6e' : '#c77dff'} />
        </div>
        <Link href="/reps" className="btn-quiet shrink-0 px-4" aria-label="Do 2-minute reps">
          <Dumbbell className="h-4 w-4" aria-hidden="true" /> 2 min
        </Link>
      </section>

      {allNodes.map(({ tier, nodes }) => {
        const rubric = curriculum.rubrics[tier];
        const unlocked = tierUnlocked(trajectory, tier);
        const passedSteps = nodes.filter((node) => node.state === 'done').length;
        return (
          <section key={tier} className="mt-8" aria-labelledby={`pillar-${tier}`}>
            <div
              className="flex items-center gap-4 rounded-[20px] p-4"
              style={{ background: unlocked ? PILLAR_TINT[tier as Tier] : '#f4f5f7' }}
            >
              <div className="flex flex-1 flex-col gap-1">
                <p className="t-label" style={{ color: unlocked ? rubric.text_color : undefined }}>
                  Pillar {rubric.pillar} · {rubric.role_title}
                </p>
                <h2 id={`pillar-${tier}`} className="t-heading">
                  {rubric.transition_banner.title}
                </h2>
                <p className="t-small">
                  {rubric.acv_band} deals · {passedSteps} of {nodes.length} steps
                </p>
              </div>
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper"
                style={{ color: unlocked ? rubric.text_color : '#5e6672' }}
                aria-hidden="true"
              >
                {unlocked ? <PillarIcon name={rubric.icon} className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
              </span>
            </div>

            <ol className="mt-6 flex flex-col items-center gap-5">
              {nodes.map((node, index) => (
                <li key={node.key} className={`flex flex-col items-center gap-2 ${node.state === 'current' ? 'pt-12' : ''}`} style={{ transform: `translateX(${OFFSETS[index] ?? '0px'})` }}>
                  <PathButton node={node} color={rubric.text_color} tint={PILLAR_TINT[tier as Tier]} />
                  <span className={`max-w-[160px] text-center text-[13px] font-semibold leading-tight ${node.state === 'locked' ? 'text-slate' : 'text-ink'}`}>
                    {node.title}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <section className="mt-10 flex items-center gap-4 rounded-[20px] border-2 border-dashed border-rule-strong p-5">
        <Award className="h-8 w-8 shrink-0 text-slate" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <p className="t-item">Deal playbook certificate</p>
          <p className="t-small">
            {bossesPassed(trajectory) === 4 ? 'Unlocked. Every boss fight passed.' : `Unlocks after all 4 boss fights. ${bossesPassed(trajectory)} of 4 passed.`}
          </p>
        </div>
      </section>
    </AppShell>
  );
}

function PathButton({ node, color, tint }: { node: PathNode; color: string; tint: string }) {
  const size = node.kind === 'boss' ? 'h-[88px] w-[88px] rounded-[28px]' : 'h-[76px] w-[76px] rounded-full';
  const label = `${node.kind === 'boss' ? 'Boss fight' : 'Drill'}: ${node.title}, ${node.state === 'current' ? 'start' : node.state}`;
  const Icon = node.kind === 'boss' ? Crown : Play;

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
  return (
    <span className="relative">
      {isCurrent && (
        <span
          className="absolute -top-11 left-1/2 -translate-x-1/2 animate-pop whitespace-nowrap rounded-xl border-2 bg-paper px-3 py-1.5 text-[13px] font-bold shadow-lift"
          style={{ borderColor: color, color }}
          aria-hidden="true"
        >
          Start
        </span>
      )}
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
