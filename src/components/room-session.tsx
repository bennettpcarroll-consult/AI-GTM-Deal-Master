'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Check, ChevronDown, Lightbulb, ShieldAlert, X } from 'lucide-react';
import { BRAND, PILLAR_TINT } from '@/lib/brand';
import { composeScenario } from '@/lib/composer';
import { loadCurriculum, scenarioFor, signalDefinitions } from '@/lib/curriculum/load';
import type { SignalId, Skill, Tier } from '@/lib/curriculum/schema';
import { recordActivity } from '@/lib/engagement';
import { gradeSession, type GradeResult } from '@/lib/grader';
import { requestHint, sendLearnerMessage, startSimulation, verifiedCount, type SimContext, type SimState, type Turn } from '@/lib/simulator';
import { buildSkillProbes, drillSkillIds, MASTERY_LABELS, proofCount, skillMastery, tierSkillIds } from '@/lib/skills';
import { recordSession, type SessionRecord, type Trajectory } from '@/lib/store';
import { useAppState, type UpdateAppState } from '@/lib/use-app-state';
import { Bars, FocusScreen, ProgressBar } from './ui';

interface RoomSessionProps {
  trajectory: Trajectory;
  tier: Tier;
  mode: 'drill' | 'boss';
  drillIndex: number;
  update: UpdateAppState;
  onRetake: () => void;
}

type Phase = 'brief' | 'room' | 'debrief';

interface Proof {
  key: string;
  title: string;
  turnId: string;
  /** Shown only the first time the learner earns this proof, so it never turns into boilerplate. */
  why: string | null;
}

const NOT_SURE_MESSAGE = "I'm not sure yet, so I won't guess. Can you walk me through it?";

export function RoomSession({ trajectory, tier, mode, drillIndex, update, onRetake }: RoomSessionProps) {
  const curriculum = loadCurriculum();
  const cluster = curriculum.clusters[trajectory.clusterId];
  const vertical = curriculum.verticals[trajectory.verticalId];
  const scenario = scenarioFor(curriculum, cluster.id, vertical.id);
  const rubric = curriculum.rubrics[tier];
  const signals = signalDefinitions(curriculum);
  const isBoss = mode === 'boss';
  const color = rubric.text_color;
  const tint = PILLAR_TINT[tier];

  const payload = useMemo(
    () => composeScenario({ cluster, vertical, rubric, mode, drillIndex }),
    [cluster, vertical, rubric, mode, drillIndex]
  );
  const ctx = useMemo<SimContext>(
    () => ({
      vertical,
      signals,
      objections: payload.objection_queue,
      personaRoles: payload.personas.map((persona) => persona.role),
      skillProbes: buildSkillProbes(curriculum, scenario)
    }),
    [vertical, signals, payload, curriculum, scenario]
  );
  const skillIds = useMemo(
    () => (isBoss ? tierSkillIds(curriculum, rubric) : drillSkillIds(curriculum, rubric, drillIndex)),
    [curriculum, rubric, drillIndex, isBoss]
  );
  const skills = skillIds.map((id) => curriculum.skills.find((skill) => skill.id === id)).filter((skill): skill is Skill => Boolean(skill));
  const signalSkill = (signal: SignalId) => curriculum.skills.find((skill) => skill.signal === signal);
  const signalLabel = (signal: SignalId) => signals.find((definition) => definition.id === signal)?.label ?? signal;
  const provenBefore = (key: string) =>
    trajectory.sessions.some((session) => session.bindings[key as SignalId]?.bars === 4 || session.skillEvidence?.[key]?.level === 'verbatim');

  const [phase, setPhase] = useState<Phase>('brief');
  const [sim, setSim] = useState<SimState>(() => startSimulation(ctx, { mode, targetSignals: payload.target_signals }));
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<{ text: string; strong?: string } | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [debrief, setDebrief] = useState<{ grade: GradeResult; record: SessionRecord; points: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const verified = verifiedCount(sim);
  const targetTotal = sim.targetSignals.length;
  const allVerified = verified === targetTotal;
  const drill = rubric.drills[drillIndex];
  const title = isBoss ? rubric.boss_fight.title.replace(/^Boss fight · /, '') : (drill?.title ?? '');
  const kicker = `Pillar ${rubric.pillar} · ${isBoss ? 'Boss fight' : `Drill ${drillIndex + 1} of 3`}`;

  const lastLearnerIndex = sim.turns.map((turn) => turn.speaker).lastIndexOf('learner');
  const latest = sim.turns.slice(lastLearnerIndex + 1).filter((turn) => turn.speaker === 'buyer');

  useEffect(() => {
    if (phase !== 'room') return;
    inputRef.current?.focus({ preventScroll: true });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [phase, sim.turns.length]);

  const submit = (text: string) => {
    if (text.trim().length === 0) return;
    const next = sendLearnerMessage(ctx, sim, text);
    const fresh: Proof[] = [];
    for (const signal of next.targetSignals) {
      if (sim.bindings[signal].bars !== 4 && next.bindings[signal].bars === 4) {
        const turn = next.turns.find((candidate) => candidate.id === next.bindings[signal].transcript_turn_id);
        fresh.push({
          key: signal,
          title: `${signalLabel(signal)} verified`,
          turnId: turn?.id ?? '',
          why: provenBefore(signal) ? null : (signalSkill(signal)?.talk_track.move ?? null)
        });
      }
    }
    for (const [skillId, evidence] of Object.entries(next.skillEvidence)) {
      if (evidence.level === 'verbatim' && sim.skillEvidence[skillId]?.level !== 'verbatim') {
        const skill = curriculum.skills.find((candidate) => candidate.id === skillId);
        const turn = next.turns.find((candidate) => candidate.id === evidence.transcript_turn_id);
        fresh.push({
          key: skillId,
          title: `${skill?.label ?? skillId} verified`,
          turnId: turn?.id ?? '',
          why: provenBefore(skillId) ? null : (skill?.talk_track.move ?? null)
        });
      }
    }
    setSim(next);
    setDraft('');
    setHint(null);
    setProofs(fresh);
  };

  const askForHint = () => {
    const result = requestHint(ctx, sim);
    setSim(result.state);
    const open = sim.targetSignals.find((signal) => sim.bindings[signal].bars !== 4);
    setHint(
      result.hint
        ? { text: result.hint, strong: open ? signalSkill(open)?.talk_track.strong : undefined }
        : { text: 'Every target signal already has buyer proof. Finish the drill.' }
    );
  };

  const finish = () => {
    const result = gradeSession(rubric, sim);
    const record: SessionRecord = {
      id: `s-${Date.now().toString(36)}`,
      tier,
      mode,
      drillId: isBoss ? null : (drill?.id ?? null),
      score: result.score,
      passed: result.passed,
      autoFailIds: result.autoFails.map((flag) => flag.id),
      bindings: sim.bindings,
      transcript: sim.turns,
      createdAt: new Date().toISOString(),
      skillEvidence: sim.skillEvidence,
      hintsUsed: sim.hintsUsed
    };
    const points = proofCount(record);
    update((current) => recordActivity(recordSession(current, trajectory.id, record), { reps: 1, proofs: points }));
    setDebrief({ grade: result, record, points });
    setPhase('debrief');
    window.scrollTo({ top: 0 });
  };

  if (phase === 'brief') {
    return (
      <FocusScreen
        top={
          <div className="flex h-11 items-center justify-between">
            <Link href="/path" aria-label="Close" className="-ml-2.5 grid h-11 w-11 place-items-center rounded-full text-slate hover:bg-deep">
              <X className="h-6 w-6" aria-hidden="true" />
            </Link>
            <span className="t-label" style={{ color }}>
              {kicker}
            </span>
            <span className="w-11" />
          </div>
        }
        footer={
          <>
            <p className="t-small mb-3 text-center">
              Pass at {isBoss ? rubric.boss_pass_min : rubric.core_gate_pass_min}%. {isBoss ? 'Zero red flags, no hints.' : 'A signal only counts when the buyer says it.'}
            </p>
            <button type="button" className="btn-lit" onClick={() => setPhase('room')}>
              Enter the room
            </button>
          </>
        }
      >
        <div className="flex animate-rise flex-col gap-3 pt-5">
          <h1 className="t-title">{title}</h1>
          <p className="t-lede">{isBoss ? rubric.boss_fight.learner_brief : drill?.prompt}</p>
        </div>

        <div className="panel mt-5 flex flex-col gap-1.5 p-4">
          <p className="t-label">The situation</p>
          <p className="t-body">{scenario.situation}</p>
        </div>

        <section className="card mt-4 flex flex-col gap-3 p-5" aria-label="Signals to prove">
          <p className="t-label">Prove {targetTotal} signals with buyer words</p>
          <ul className="flex flex-col divide-y divide-rule">
            {sim.targetSignals.map((signal) => {
              const skill = signalSkill(signal);
              return (
                <li key={signal} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-[14px] font-extrabold" style={{ background: tint, color }}>
                    {skill?.code ?? signalLabel(signal).charAt(0)}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="t-item">{signalLabel(signal)}</span>
                    <span className="t-small">{skill?.talk_track.proof}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-4 flex flex-col gap-2" aria-label="Skills this builds">
          <p className="t-label">Skills you build here</p>
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <li key={skill.id} className="rounded-full border border-hairline px-3 py-1.5 text-[13px] font-semibold">
                {skill.code} {skill.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 flex flex-col gap-2 pb-2" aria-label="Buyers in the room">
          <p className="t-label">In the room</p>
          <ul className="flex flex-wrap gap-1.5">
            {payload.personas.map((persona) => (
              <li key={persona.role} className="rounded-full bg-deep px-3 py-1.5 text-[13px] font-semibold">
                {persona.role}
              </li>
            ))}
          </ul>
        </section>
      </FocusScreen>
    );
  }

  if (phase === 'debrief' && debrief) {
    return (
      <Debrief
        grade={debrief.grade}
        record={debrief.record}
        points={debrief.points}
        title={title}
        kicker={kicker}
        isBoss={isBoss}
        tier={tier}
        skills={skills}
        trajectoryId={trajectory.id}
        signalLabel={signalLabel}
        color={color}
        onRetake={onRetake}
      />
    );
  }

  return (
    <FocusScreen
      top={
        <div className="flex flex-col gap-3">
          <div className="flex h-11 items-center gap-3">
            <Link href="/path" aria-label="Leave the room" className="-ml-2.5 grid h-11 w-11 place-items-center rounded-full text-slate hover:bg-deep">
              <X className="h-6 w-6" aria-hidden="true" />
            </Link>
            {isBoss ? (
              <ProgressBar value={verified} max={targetTotal} label="Signals verified" color={BRAND.profit} />
            ) : (
              <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${targetTotal}, minmax(0, 1fr))` }} role="progressbar" aria-label="Signals verified" aria-valuenow={verified} aria-valuemin={0} aria-valuemax={targetTotal}>
                {sim.targetSignals.map((signal) => (
                  <span key={signal} className="h-2.5 rounded-full transition-colors duration-500" style={{ background: sim.bindings[signal].bars === 4 ? BRAND.profit : sim.bindings[signal].bars === 3 ? tint : BRAND.deep }} />
                ))}
              </div>
            )}
            {!isBoss && (
              <button
                type="button"
                onClick={askForHint}
                aria-label="Coach hint"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rule-strong hover:bg-deep"
                style={{ color }}
              >
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Target signals">
            {sim.targetSignals.map((signal) => {
              const bars = sim.bindings[signal].bars;
              const done = bars === 4;
              return (
                <li
                  key={signal}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-3 pr-2 text-[12px] font-semibold ${done ? 'border-profit bg-profit-soft text-profit-ink' : 'border-dashed border-rule-strong'}`}
                >
                  {signalLabel(signal)}
                  <Bars level={bars} color={done ? BRAND.profit : color} label={signalLabel(signal)} />
                </li>
              );
            })}
          </ul>
        </div>
      }
      footer={
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              submit(draft);
            }}
            className="flex flex-col gap-2.5"
          >
            {allVerified && !isBoss ? (
              <button type="button" onClick={finish} className="btn-lit">
                All signals proven. Finish drill
              </button>
            ) : null}
            <label htmlFor="move" className="t-label">
              Your move
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="move"
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    submit(draft);
                  }
                }}
                rows={2}
                placeholder="Ask one precise question. Don't pitch yet."
                className="min-h-[56px] flex-1 resize-none rounded-panel border-2 border-rule-strong bg-paper px-4 py-3 text-[16px] leading-[1.45] placeholder:text-slate focus:border-people-ink focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={draft.trim().length === 0}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-30"
                style={{ background: color }}
              >
                <ArrowUp className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => submit(NOT_SURE_MESSAGE)} className="btn-quiet min-h-[44px] px-4 text-[14px]">
                Not sure, don&apos;t guess
              </button>
              {(!allVerified || isBoss) && (
                <button type="button" onClick={finish} className="min-h-[44px] px-2 text-[14px] font-semibold text-slate underline-offset-4 hover:underline">
                  {isBoss ? 'Grade boss fight' : 'End and grade'}
                </button>
              )}
            </div>
          </form>
      }
    >
      <div className="flex flex-1 flex-col justify-end gap-4 py-6">
        {showTranscript && (
          <div className="flex flex-col gap-2.5 border-b border-rule pb-4">
            {sim.turns.slice(0, lastLearnerIndex + 1).map((turn) => (
              <TurnBubble key={turn.id} turn={turn} />
            ))}
          </div>
        )}
        {sim.turns.length > 1 && (
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex min-h-[44px] items-center gap-1.5 self-start text-[13px] font-semibold text-work-ink"
            aria-expanded={showTranscript}
          >
            <ChevronDown className={`h-4 w-4 transition ${showTranscript ? 'rotate-180' : ''}`} aria-hidden="true" />
            {showTranscript ? 'Hide' : 'Show'} earlier turns
          </button>
        )}
        {lastLearnerIndex >= 0 && !showTranscript && (
          <p className="ml-auto max-w-[85%] rounded-[24px_24px_4px_24px] bg-work-soft px-4 py-3 text-[15px] leading-[1.45]">
            {sim.turns[lastLearnerIndex]?.content}
          </p>
        )}
        <div key={sim.turns.length} className="flex animate-rise flex-col gap-4">
          {latest.map((turn) => (
            <BuyerTurn key={turn.id} turn={turn} proofs={proofs.filter((proof) => proof.turnId === turn.id)} />
          ))}
        </div>
        {hint && (
          <div className="flex animate-rise flex-col gap-2 rounded-panel border-2 border-dashed p-4" style={{ borderColor: color }}>
            <p className="t-label" style={{ color }}>
              Coach hint
            </p>
            <p className="t-body">{hint.text}</p>
            {hint.strong && <p className="t-small">Try something like: “{hint.strong}”</p>}
          </div>
        )}
      </div>
    </FocusScreen>
  );
}

function BuyerTurn({ turn, proofs }: { turn: Turn; proofs: Proof[] }) {
  const proven = proofs.length > 0 || turn.reveal === 'verbatim';
  const status = turn.objection ? 'Objection' : turn.reveal === 'partial' ? 'Partial. Push for the number.' : null;
  const rule = proven ? BRAND.profit : turn.objection ? BRAND.leak : '#d5d8de';
  return (
    <div className="flex flex-col gap-2">
      <p className="t-small">
        <span className="font-semibold text-ink">{turn.speakerRole}</span>
        {status && <span className={turn.objection ? 'text-leak-ink' : ''}> · {status}</span>}
      </p>
      <blockquote className="t-quote border-l-[3px] pl-4" style={{ borderColor: rule }}>
        {turn.content}
      </blockquote>
      {proofs.map((proof) => (
        <div key={proof.key} className="ml-[19px] flex animate-pop flex-col gap-1" role="status">
          <p className="flex items-center gap-2 text-[14px] font-bold text-profit-ink">
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            {proof.title}
            <span className="rounded-full bg-profit-soft px-2 py-0.5 text-[12px]">+10</span>
          </p>
          {proof.why && <p className="t-small">{proof.why}</p>}
        </div>
      ))}
    </div>
  );
}

function TurnBubble({ turn }: { turn: Turn }) {
  const isLearner = turn.speaker === 'learner';
  return (
    <div className={`flex flex-col gap-1 ${isLearner ? 'items-end' : 'items-start'}`}>
      <span className="t-small">{isLearner ? 'You' : turn.speakerRole}</span>
      <p
        className={`max-w-[85%] px-4 py-2.5 text-[15px] leading-[1.45] ${isLearner ? 'rounded-[20px_20px_4px_20px] bg-work-soft' : 'rounded-[4px_20px_20px_20px] bg-deep'}`}
        style={turn.reveal === 'verbatim' ? { background: BRAND.profitSoft } : undefined}
      >
        {turn.content}
      </p>
    </div>
  );
}

function Debrief({
  grade,
  record,
  points,
  title,
  kicker,
  isBoss,
  tier,
  skills,
  trajectoryId,
  signalLabel,
  color,
  onRetake
}: {
  grade: GradeResult;
  record: SessionRecord;
  points: number;
  title: string;
  kicker: string;
  isBoss: boolean;
  tier: Tier;
  skills: Skill[];
  trajectoryId: string;
  signalLabel: (signal: SignalId) => string;
  color: string;
  onRetake: () => void;
}) {
  const curriculum = loadCurriculum();
  const questions = record.transcript.filter((turn) => turn.speaker === 'learner').length;
  const consumption = Object.values(grade.skillEvidence);

  return (
    <FocusScreen
      top={<span />}
      footer={
        <div className="flex flex-col gap-2">
          <Link href="/path" className="btn-lit">
            {grade.passed ? 'Continue' : 'Back to my path'}
          </Link>
          <button type="button" onClick={onRetake} className="btn-quiet w-full">
            {grade.passed ? 'Practice again' : 'Try again'}
          </button>
        </div>
      }
    >
      <div className="flex animate-rise flex-col items-center gap-2 pt-6 text-center">
        <p className="t-label">{kicker} · {title}</p>
        <h1 className="t-display">{grade.passed ? (isBoss ? 'Boss defeated.' : 'Drill passed.') : 'Not yet.'}</h1>
        <p className="t-stat animate-pop" style={{ color: grade.passed ? BRAND.profitInk : color }}>
          {grade.score}%
        </p>
        <p className="t-small">
          Gate {grade.gate}% · {grade.verifiedCount} of {grade.targetSignals.length} signals proven by the buyer
        </p>
        {isBoss && grade.passed && tier < 4 && <p className="t-item text-profit-ink">Pillar 0{tier + 1} is now unlocked.</p>}
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-2">
        {[
          ['Proof points', `+${points * 10}`],
          ['Questions', String(questions)],
          ['Red flags', String(grade.autoFails.length)]
        ].map(([label, value]) => (
          <div key={label} className="panel flex flex-col items-center gap-0.5 p-3">
            <dt className="t-small order-2">{label}</dt>
            <dd className="order-1 font-display text-[22px] font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {grade.autoFails.length > 0 && (
        <section className="mt-4 rounded-panel border border-leak bg-leak-soft p-4" aria-label="Red flags">
          <p className="t-label text-leak-ink">Red flags</p>
          <ul className="mt-2 flex flex-col gap-2">
            {grade.autoFails.map((flag) => (
              <li key={flag.id} className="flex items-start gap-2 text-[14px] text-leak-ink">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-bold">{flag.label}.</span> <span className="text-charcoal">{flag.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 flex flex-col gap-2.5" aria-label="Evidence">
        <p className="t-label">Buyer proof</p>
        <ul className="card divide-y divide-rule px-4">
          {[
            ...grade.targetSignals.map((signal) => {
              const bars = grade.bindings[signal].bars;
              return {
                key: signal,
                label: signalLabel(signal),
                done: bars === 4,
                next: bars === 3 ? 'Acknowledged without a number, name or date. Ask a sharper follow-up.' : (curriculum.skills.find((skill) => skill.signal === signal)?.talk_track.move ?? 'Not probed yet.')
              };
            }),
            ...consumption.map((item) => ({
              key: item.skill,
              label: curriculum.skills.find((candidate) => candidate.id === item.skill)?.label ?? item.skill,
              done: item.level === 'verbatim',
              next: 'The buyer hinted at it. Ask for the numbers.'
            }))
          ].map((row) => (
            <li key={row.key} className="flex items-start gap-3 py-3">
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${row.done ? 'bg-profit text-white' : 'border-2 border-dashed border-rule-strong'}`}
                aria-hidden="true"
              >
                {row.done && <Check className="h-3 w-3" strokeWidth={3.5} />}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">
                  {row.label}
                  <span className="sr-only">{row.done ? ', verified' : ', not verified'}</span>
                </span>
                {!row.done && <span className="t-small">{row.next}</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Signal skills already appear under buyer proof, so list only the other skills this drill built. */}
      <SkillsBuilt skills={skills.filter((skill) => !skill.signal || !grade.targetSignals.includes(skill.signal))} trajectoryId={trajectoryId} />
    </FocusScreen>
  );
}

function SkillsBuilt({ skills, trajectoryId }: { skills: Skill[]; trajectoryId: string }) {
  const curriculum = loadCurriculum();
  const { state } = useAppState();
  const trajectory = state?.trajectories.find((candidate) => candidate.id === trajectoryId);
  const levels: Record<string, number> = state
    ? Object.fromEntries(skills.map((skill) => [skill.id, skillMastery(curriculum, state, trajectory, skill.id)]))
    : {};

  return (
    <section className="mb-2 mt-6 flex flex-col gap-2" aria-label="Skills built">
      <p className="t-label">Skills you built</p>
      <ul className="flex flex-col divide-y divide-rule rounded-panel border border-hairline">
        {skills.map((skill) => {
          const level = (levels[skill.id] ?? 1) as 1 | 2 | 3 | 4;
          return (
            <li key={skill.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-8 font-display text-[14px] font-extrabold text-slate">{skill.code}</span>
              <span className="flex-1 text-[15px] font-semibold">{skill.label}</span>
              <span className="t-small">{MASTERY_LABELS[level]}</span>
              <Bars level={level} color={BRAND.peopleInk} label={skill.label} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
