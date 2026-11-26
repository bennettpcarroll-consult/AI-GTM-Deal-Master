'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Building2, Check, ChevronDown, Crown, MessageSquareWarning, ShieldAlert, Target, Users, X } from 'lucide-react';
import { IconTile, SignalIcon } from './glyph';
import { BRAND, PILLAR_TINT } from '@/lib/brand';
import { loadCurriculum, scenarioFor, signalDefinitions } from '@/lib/curriculum/load';
import { SIGNAL_IDS, type SignalId, type Skill, type Tier } from '@/lib/curriculum/schema';
import { chooseMove, currentBeat, roomDone, roomProgress, setUpRoom, trustLabel, type Beat, type Outcome, type Pick, type RoomState } from '@/lib/deal-room';
import { recordActivity } from '@/lib/engagement';
import { gradeSession, type GradeResult } from '@/lib/grader';
import type { Turn } from '@/lib/simulator';
import { drillSkillIds, proofCount, skillMastery, tierSkillIds } from '@/lib/skills';
import { recordSession, type SessionRecord, type Trajectory } from '@/lib/store';
import { useAppState, type UpdateAppState } from '@/lib/use-app-state';
import { FocusScreen, MasteryBadge, ProgressBar, SignalState } from './ui';

interface RoomSessionProps {
  trajectory: Trajectory;
  tier: Tier;
  mode: 'drill' | 'boss';
  drillIndex: number;
  update: UpdateAppState;
  onRetake: () => void;
}

type Phase = 'brief' | 'room' | 'debrief';

const EARLIER_VISIBLE = 6;

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

  const setup = useMemo(
    () => setUpRoom(curriculum, { clusterId: cluster.id, verticalId: vertical.id, tier, mode, drillIndex }),
    [curriculum, cluster.id, vertical.id, tier, mode, drillIndex]
  );
  const { payload, rc } = setup;
  const skillIds = useMemo(
    () => (isBoss ? tierSkillIds(curriculum, rubric) : drillSkillIds(curriculum, rubric, drillIndex)),
    [curriculum, rubric, drillIndex, isBoss]
  );
  const skills = skillIds.map((id) => curriculum.skills.find((skill) => skill.id === id)).filter((skill): skill is Skill => Boolean(skill));
  const signalSkill = (signal: SignalId) => curriculum.skills.find((skill) => skill.signal === signal);
  const signalLabel = (signal: SignalId) => signals.find((definition) => definition.id === signal)?.label ?? signal;

  const [phase, setPhase] = useState<Phase>('brief');
  const [room, setRoom] = useState<RoomState>(setup.state);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Outcome | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [debrief, setDebrief] = useState<{ grade: GradeResult; record: SessionRecord; points: number; room: RoomState } | null>(null);
  const movesRef = useRef<HTMLDivElement>(null);

  const sim = room.sim;
  const beat = currentBeat(rc, room);
  const done = roomDone(room);
  const progress = roomProgress(room);
  const drill = rubric.drills[drillIndex];
  const title = isBoss ? rubric.boss_fight.title.replace(/^Boss fight · /, '') : (drill?.title ?? '');
  const kicker = `Pillar ${rubric.pillar} · ${isBoss ? 'Boss fight' : `Drill ${drillIndex + 1} of 3`}`;

  const lastLearnerIndex = sim.turns.map((turn) => turn.speaker).lastIndexOf('learner');
  const latest = sim.turns.slice(lastLearnerIndex + 1).filter((turn) => turn.speaker === 'buyer');
  const earlier = lastLearnerIndex > 0 ? sim.turns.slice(0, lastLearnerIndex) : [];
  const hiddenEarlier = Math.max(0, earlier.length - EARLIER_VISIBLE);

  useEffect(() => {
    if (phase !== 'room') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [phase, sim.turns.length, feedback]);

  const check = () => {
    if (picked === null || !beat || feedback) return;
    const { state, outcome } = chooseMove(rc, room, picked);
    setRoom(state);
    setPicked(null);
    // Boss fights run without coaching. Drills show the verdict and why before the next beat.
    if (!isBoss) setFeedback(outcome);
  };

  const finish = () => {
    const result = gradeSession(rubric, room.sim);
    const record: SessionRecord = {
      id: `s-${Date.now().toString(36)}`,
      tier,
      mode,
      drillId: isBoss ? null : (drill?.id ?? null),
      score: result.score,
      passed: result.passed,
      autoFailIds: result.autoFails.map((flag) => flag.id),
      bindings: room.sim.bindings,
      transcript: room.sim.turns,
      createdAt: new Date().toISOString(),
      skillEvidence: room.sim.skillEvidence,
      hintsUsed: 0
    };
    const points = proofCount(record);
    update((current) => recordActivity(recordSession(current, trajectory.id, record), { reps: 1, proofs: points }));
    setDebrief({ grade: result, record, points, room });
    setPhase('debrief');
    window.scrollTo({ top: 0 });
  };

  // 1, 2, 3 pick a move. Enter checks, continues, or opens the debrief.
  useEffect(() => {
    if (phase !== 'room') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const number = Number(event.key);
      if (!feedback && beat && Number.isInteger(number) && number >= 1 && number <= beat.moves.length) {
        event.preventDefault();
        setPicked(number - 1);
      } else if (event.key === 'Enter' && !(target instanceof HTMLButtonElement) && !(target instanceof HTMLAnchorElement)) {
        event.preventDefault();
        if (feedback) setFeedback(null);
        else if (done) finish();
        else check();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
              Pass at {isBoss ? rubric.boss_pass_min : rubric.core_gate_pass_min}%. {isBoss ? 'No coaching, zero red flags.' : 'Tap your move. A signal only counts when the buyer says it.'}
            </p>
            <button type="button" className="btn-lit" onClick={() => setPhase('room')}>
              Enter the room
            </button>
          </>
        }
      >
        <div className="flex animate-rise flex-col gap-3 pt-5">
          <IconTile tint={tint} color={color} size="lg">
            {isBoss ? <Crown className="h-8 w-8" strokeWidth={1.75} /> : <Target className="h-8 w-8" strokeWidth={1.75} />}
          </IconTile>
          <h1 className="t-title mt-1">{title}</h1>
          <p className="t-lede">{isBoss ? rubric.boss_fight.learner_brief : drill?.prompt}</p>
        </div>

        <section className="card mt-6 flex flex-col gap-4 p-5" aria-label="Your mission">
          <p className="t-label" style={{ color }}>
            Your mission: get the buyer to say
          </p>
          <ul className="flex flex-col gap-4">
            {sim.targetSignals.map((signal) => (
              <li key={signal} className="flex items-start gap-3">
                <IconTile tint={tint} color={color} size="sm">
                  <SignalIcon signal={signal} className="h-[18px] w-[18px]" />
                </IconTile>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="t-item">{signalLabel(signal)}</span>
                  <span className="t-small">{signalSkill(signal)?.talk_track.proof}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 flex flex-col gap-4 pb-2">
          <div className="flex items-start gap-3">
            <IconTile tint="#f4f5f7" color="#5e6672" size="sm">
              <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </IconTile>
            <p className="t-body flex-1 text-charcoal">{scenario.situation}</p>
          </div>
          <div className="flex items-start gap-3">
            <IconTile tint="#f4f5f7" color="#5e6672" size="sm">
              <Users className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </IconTile>
            <p className="t-body flex-1 text-charcoal">{meetLine(payload.personas.map((persona) => persona.role))}</p>
          </div>
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
        room={debrief.room}
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

  const footer = feedback ? (
    <FeedbackDrawer outcome={feedback} onContinue={() => setFeedback(null)} />
  ) : done ? (
    <button type="button" onClick={finish} className="btn-lit">
      {room.walkedOut ? 'See what went wrong' : 'See your debrief'}
    </button>
  ) : (
    <button type="button" onClick={check} disabled={picked === null} className="btn-lit">
      Check
    </button>
  );

  return (
    <FocusScreen
      top={
        <div className="flex h-11 items-center gap-3">
          <Link href="/path" aria-label="Leave the room" className="-ml-2.5 grid h-11 w-11 place-items-center rounded-full text-slate hover:bg-deep">
            <X className="h-6 w-6" aria-hidden="true" />
          </Link>
          <ProgressBar value={progress.value} max={progress.max} label="Meeting progress" color={color} />
          <SignalTracker turns={sim.turns} bindings={sim.bindings} signals={isBoss ? [...SIGNAL_IDS] : sim.targetSignals} label={isBoss ? 'MEDDPICC' : 'Signals'} signalLabel={signalLabel} />
        </div>
      }
      footer={footer}
    >
      <div className="flex flex-1 flex-col gap-4 py-6">
        {hiddenEarlier > 0 && (
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex min-h-[44px] items-center gap-1.5 self-start text-[13px] font-semibold text-work-ink"
            aria-expanded={showTranscript}
          >
            <ChevronDown className={`h-4 w-4 transition ${showTranscript ? 'rotate-180' : ''}`} aria-hidden="true" />
            {showTranscript ? 'Hide earlier turns' : `Show ${hiddenEarlier} earlier turn${hiddenEarlier === 1 ? '' : 's'}`}
          </button>
        )}
        {(showTranscript ? earlier : earlier.slice(-EARLIER_VISIBLE)).map((turn) => (
          <TurnBubble key={turn.id} turn={turn} />
        ))}
        {lastLearnerIndex >= 0 && (
          <div className="flex flex-col items-end gap-1">
            <span className="t-small">You</span>
            <p className="max-w-[85%] rounded-[24px_24px_4px_24px] bg-work-soft px-4 py-3 text-[15px] leading-[1.45]">{sim.turns[lastLearnerIndex]?.content}</p>
          </div>
        )}
        <div key={sim.turns.length} className="flex animate-rise flex-col gap-4">
          {latest.map((turn) => (
            <BuyerTurn key={turn.id} turn={turn} />
          ))}
        </div>

        {beat && !feedback && (
          <div ref={movesRef} key={`${beat.id}-${room.attempts}`} className="mt-2 flex animate-rise flex-col gap-2.5" role="group" aria-label="Your move">
            <MoveHeading beat={beat} isBoss={isBoss} retry={room.attempts > 0} color={color} tint={tint} signalLabel={signalLabel} skillLabel={(id) => curriculum.skills.find((skill) => skill.id === id)?.label ?? ''} />
            {beat.moves.map((move, index) => (
              <button key={move.text} type="button" className="choice" aria-pressed={picked === index} onClick={() => setPicked(index)}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-rule-strong text-[13px] font-bold text-slate" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="t-body">{move.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </FocusScreen>
  );
}

/** One line above the moves. Drills name the goal. Boss fights only say whose turn it is. */
function MoveHeading({
  beat,
  isBoss,
  retry,
  color,
  tint,
  signalLabel,
  skillLabel
}: {
  beat: Beat;
  isBoss: boolean;
  retry: boolean;
  color: string;
  tint: string;
  signalLabel: (signal: SignalId) => string;
  skillLabel: (id: string) => string;
}) {
  if (isBoss) return <p className="t-label">Your move</p>;
  const goal =
    beat.kind === 'objection'
      ? 'Handle the objection'
      : beat.signal
        ? `${beat.kind === 'pin' ? 'Pin down' : 'Open'}: ${signalLabel(beat.signal)}`
        : beat.kind === 'pin'
          ? `Pin down: ${skillLabel(beat.skillId ?? '')}`
          : skillLabel(beat.skillId ?? '');
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: tint, color }} aria-hidden="true">
        {beat.kind === 'objection' ? (
          <MessageSquareWarning className="h-4 w-4" />
        ) : beat.signal ? (
          <SignalIcon signal={beat.signal} className="h-4 w-4" />
        ) : (
          <Target className="h-4 w-4" />
        )}
      </span>
      <p className="text-[14px] font-bold" style={{ color }}>
        {goal}
      </p>
      {retry && <span className="t-small">· Try again</span>}
    </div>
  );
}

/** The Duolingo reveal: one verdict line, detail folded away, one way forward. */
function FeedbackDrawer({ outcome, onContinue }: { outcome: Outcome; onContinue: () => void }) {
  const good = outcome.kind === 'elite';
  return (
    <div className={`-mx-5 max-h-[70dvh] animate-rise overflow-y-auto rounded-t-card px-5 pb-2 pt-5 ${good ? 'bg-profit-soft' : 'bg-leak-soft'}`} role="status">
      <div className="mb-3 flex items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white ${good ? 'bg-profit-ink' : 'bg-leak-ink'}`}>
          {good ? <Check className="h-5 w-5" aria-hidden="true" /> : <X className="h-5 w-5" aria-hidden="true" />}
        </span>
        <p className={`text-[17px] font-bold leading-snug ${good ? 'text-profit-ink' : 'text-leak-ink'}`}>{outcome.verdict}</p>
      </div>
      <div className="mb-4 flex flex-col divide-y divide-rule rounded-panel bg-paper/70">
        {!good && <Disclosure label="Elite move">“{outcome.elite}”</Disclosure>}
        <Disclosure label="Why it works">{outcome.why}</Disclosure>
        {outcome.evidence && (
          <Disclosure label="Buyer evidence">
            <span className="flex flex-col gap-1">
              <span className="t-quote text-[15px]">“{outcome.evidence.quote}”</span>
              <span className="t-small">{outcome.evidence.level === 'verbatim' ? `Counts as proof for ${outcome.evidence.label}.` : 'Acknowledged, but no number, name or date yet.'}</span>
            </span>
          </Disclosure>
        )}
      </div>
      <button type="button" onClick={onContinue} className={good ? 'btn-profit' : 'btn-leak'} autoFocus>
        {good ? 'Continue' : 'Try again'}
      </button>
    </div>
  );
}

function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group px-4">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="h-4 w-4 text-slate transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="t-body pb-3 text-charcoal">{children}</div>
    </details>
  );
}

/** "MEDDPICC 3/8" pill. Opens to each signal's state and the buyer's own words. */
function SignalTracker({
  turns,
  bindings,
  signals,
  label,
  signalLabel
}: {
  turns: Turn[];
  bindings: RoomState['sim']['bindings'];
  signals: SignalId[];
  label: string;
  signalLabel: (signal: SignalId) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const verified = signals.filter((signal) => bindings[signal].bars === 4).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-rule-strong px-3 text-[13px] font-bold tabular-nums hover:bg-deep"
      >
        <span className={verified === signals.length ? 'text-profit-ink' : ''}>
          {label} {verified}/{signals.length}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-[min(340px,calc(100vw-40px))] animate-rise rounded-panel border border-hairline bg-paper p-2 shadow-float">
          <ul className="flex flex-col">
            {signals.map((signal) => {
              const binding = bindings[signal];
              const quote = binding.bars >= 3 ? turns.find((turn) => turn.signal === signal && turn.reveal === (binding.bars === 4 ? 'verbatim' : 'partial'))?.content : undefined;
              return (
                <li key={signal} className="flex flex-col gap-1 rounded-xl px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <SignalIcon signal={signal} className="h-4 w-4 text-slate" />
                    <SignalState bars={binding.bars} label={signalLabel(signal)} />
                  </span>
                  {quote && <span className="t-small pl-6 italic">“{quote}”</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** "You'll meet the CMO, the CFO and 2 others." Names at most two roles so the line stays short. */
function meetLine(roles: string[]): string {
  if (roles.length === 0) return 'You will meet the buying committee.';
  if (roles.length === 1) return `You will meet the ${roles[0]}.`;
  if (roles.length === 2) return `You will meet the ${roles[0]} and the ${roles[1]}.`;
  const rest = roles.length - 2;
  return `You will meet the ${roles[0]}, the ${roles[1]} and ${rest} other${rest === 1 ? '' : 's'} from the buying committee.`;
}

function BuyerTurn({ turn }: { turn: Turn }) {
  const status = turn.objection ? 'Objection' : turn.reveal === 'partial' ? 'Partial. Push for the number.' : turn.reveal === 'verbatim' ? 'Verified' : null;
  const rule = turn.reveal === 'verbatim' ? BRAND.profit : turn.objection ? BRAND.leak : '#d5d8de';
  return (
    <div className="flex flex-col gap-2">
      <p className="t-small">
        <span className="font-semibold text-ink">{turn.speakerRole}</span>
        {status && <span className={turn.objection ? 'text-leak-ink' : turn.reveal === 'verbatim' ? 'font-semibold text-profit-ink' : ''}> · {status}</span>}
      </p>
      <blockquote className="t-quote border-l-[3px] pl-4" style={{ borderColor: rule }}>
        {turn.content}
      </blockquote>
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
  room,
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
  room: RoomState;
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
  const consumption = Object.values(grade.skillEvidence);
  // Misses worth replaying: the last miss on each beat, newest first. Drills repeat a missed beat, so one beat can hold several.
  const misses = [...new Map(room.picks.filter((pick) => pick.kind !== 'elite').map((pick) => [pick.beatId, pick] as const)).values()].reverse();
  const walkoutRole = room.walkedOut ? record.transcript.at(-1)?.speakerRole : undefined;

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
          ['Buyer trust', trustLabel(room.mood, room.walkedOut)],
          ['Red flags', String(grade.autoFails.length)]
        ].map(([label, value]) => (
          <div key={label} className="panel flex flex-col items-center gap-0.5 p-3">
            <dt className="t-small order-2">{label}</dt>
            <dd className="order-1 font-display text-[22px] font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {walkoutRole && (
        <p className="mt-4 rounded-panel bg-leak-soft p-4 text-[14px] font-semibold text-leak-ink" role="status">
          The {walkoutRole} ended the meeting. Too many moves cost trust.
        </p>
      )}

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

      {misses.length > 0 && <MovesToSharpen misses={misses} />}

      {/* Signal skills already appear under buyer proof, so list only the other skills this drill built. */}
      <SkillsBuilt skills={skills.filter((skill) => !skill.signal || !grade.targetSignals.includes(skill.signal))} trajectoryId={trajectoryId} />
    </FocusScreen>
  );
}

/** Folded by default: each miss with what the buyer said, what you said and the elite move. */
function MovesToSharpen({ misses }: { misses: Pick[] }) {
  return (
    <details className="group mt-6 rounded-panel border border-hairline">
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-2 px-4 [&::-webkit-details-marker]:hidden">
        <span className="t-item">Moves to sharpen ({misses.length})</span>
        <ChevronDown className="h-4 w-4 text-slate transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ul className="flex flex-col divide-y divide-rule border-t border-hairline">
        {misses.map((pick) => (
          <li key={pick.beatId} className="flex flex-col gap-2 px-4 py-3">
            <p className="t-small italic">“{pick.prompt}”</p>
            <p className="flex items-start gap-2 text-[14px] text-leak-ink">
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{pick.text}</span>
            </p>
            <p className="flex items-start gap-2 text-[14px] font-semibold text-profit-ink">
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{pick.elite}</span>
            </p>
          </li>
        ))}
      </ul>
    </details>
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
              <span className="flex-1 text-[15px] font-semibold">{skill.label}</span>
              <MasteryBadge level={level} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
