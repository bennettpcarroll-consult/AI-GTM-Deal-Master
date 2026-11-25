'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { CheckCircle2, HelpCircle, Lightbulb, Send, ShieldAlert, XCircle } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { composeScenario } from '@/lib/composer';
import { loadCurriculum, signalDefinitions } from '@/lib/curriculum/load';
import { SIGNAL_IDS, type SignalId, type Tier } from '@/lib/curriculum/schema';
import { gradeSession, type GradeResult } from '@/lib/grader';
import { requestHint, sendLearnerMessage, startSimulation, verifiedCount, type SimContext, type SimState, type Turn } from '@/lib/simulator';
import { recordSession, type SessionRecord, type Trajectory } from '@/lib/store';
import type { UpdateAppState } from '@/lib/use-app-state';
import { SignalBars } from './signal-bars';

interface RoomSessionProps {
  trajectory: Trajectory;
  tier: Tier;
  mode: 'drill' | 'boss';
  drillIndex: number;
  update: UpdateAppState;
  onRetake: () => void;
}

const NOT_SURE_MESSAGE = "I'm not sure yet, so I won't guess. Can you walk me through it?";

export function RoomSession({ trajectory, tier, mode, drillIndex, update, onRetake }: RoomSessionProps) {
  const curriculum = loadCurriculum();
  const cluster = curriculum.clusters[trajectory.clusterId];
  const vertical = curriculum.verticals[trajectory.verticalId];
  const rubric = curriculum.rubrics[tier];
  const signals = signalDefinitions(curriculum);
  const isBoss = mode === 'boss';

  const payload = useMemo(
    () => composeScenario({ cluster, vertical, rubric, mode, drillIndex }),
    [cluster, vertical, rubric, mode, drillIndex]
  );
  const ctx = useMemo<SimContext>(
    () => ({ vertical, signals, objections: payload.objection_queue, personaRoles: payload.personas.map((persona) => persona.role) }),
    [vertical, signals, payload]
  );

  const [sim, setSim] = useState<SimState>(() => startSimulation(ctx, { mode, targetSignals: payload.target_signals }));
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<{ grade: GradeResult; record: SessionRecord } | null>(null);

  const verified = verifiedCount(sim);
  const targetTotal = sim.targetSignals.length;
  const progressPercent = Math.round((verified / targetTotal) * 100);
  const locked = debrief !== null;

  const submit = (text: string) => {
    if (locked || text.trim().length === 0) return;
    setSim((previous) => sendLearnerMessage(ctx, previous, text));
    setDraft('');
    setHint(null);
  };

  const askForHint = () => {
    const result = requestHint(ctx, sim);
    setSim(result.state);
    setHint(result.hint ?? 'Every target signal already has buyer proof. Finish the drill.');
  };

  const jumpToQuote = (turnId: string | null) => {
    if (!turnId) return;
    setHighlight(turnId);
    document.getElementById(`dm-${turnId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const finish = () => {
    if (locked) return;
    const result = gradeSession(rubric, sim);
    const record: SessionRecord = {
      id: `s-${Date.now().toString(36)}`,
      tier,
      mode,
      drillId: isBoss ? null : (rubric.drills[drillIndex]?.id ?? null),
      score: result.score,
      passed: result.passed,
      autoFailIds: result.autoFails.map((flag) => flag.id),
      bindings: sim.bindings,
      transcript: sim.turns,
      createdAt: new Date().toISOString()
    };
    update((current) => recordSession(current, trajectory.id, record));
    setDebrief({ grade: result, record });
  };

  if (debrief) {
    return (
      <Debrief
        grade={debrief.grade}
        record={debrief.record}
        tier={tier}
        isBoss={isBoss}
        cluster={cluster}
        signalLabels={Object.fromEntries(signals.map((signal) => [signal.id, signal.label])) as Record<SignalId, string>}
        color={rubric.color}
        onRetake={onRetake}
      />
    );
  }

  const signalLabel = (id: SignalId) => signals.find((signal) => signal.id === id)?.label ?? id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: rubric.text_color }}>
            {rubric.pillar} · {rubric.role_title} · {isBoss ? 'Boss fight' : `Drill ${drillIndex + 1} of 3`}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">{isBoss ? rubric.boss_fight.title : rubric.drills[drillIndex]?.title}</h1>
          <p className="text-sm text-[#64748B]">
            {cluster.display_name} × {vertical.short_name} · {isBoss ? rubric.boss_fight.learner_brief : rubric.drills[drillIndex]?.prompt}
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-semibold text-[#475569] underline-offset-4 hover:underline">
          Back to dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card flex flex-col overflow-hidden lg:col-span-2" aria-label="Deal room conversation">
          <div className="h-1" style={{ background: rubric.color }} />
          <div className="flex max-h-[520px] min-h-[320px] flex-col gap-3 overflow-y-auto p-5">
            {sim.turns.map((turn) => (
              <TurnBubble key={turn.id} turn={turn} highlighted={highlight === turn.id} color={rubric.color} />
            ))}
          </div>

          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              submit(draft);
            }}
            className="space-y-3 border-t border-[#E5E7EB] p-5"
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit(draft);
                }
              }}
              rows={2}
              disabled={locked}
              placeholder="Ask the buyer a precise question. Enter sends, Shift+Enter adds a line."
              aria-label="Your message to the buyer"
              className="w-full resize-none rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={locked || draft.trim().length === 0}
                className="spectrum-cta inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" aria-hidden="true" /> Send
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => submit(NOT_SURE_MESSAGE)}
                className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#94A3B8] px-4 py-2 text-sm font-semibold text-[#475569] disabled:opacity-40"
              >
                <HelpCircle className="h-4 w-4" aria-hidden="true" /> Not sure · Don&apos;t guess
              </button>
              {isBoss ? (
                <span className="text-xs text-[#64748B]">Coach hints are off in boss fights.</span>
              ) : (
                <button
                  type="button"
                  disabled={locked}
                  onClick={askForHint}
                  className="inline-flex items-center gap-2 rounded-full border border-dashed px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  style={{ borderColor: rubric.color, color: rubric.text_color }}
                >
                  <Lightbulb className="h-4 w-4" aria-hidden="true" /> Coach Hint · Don&apos;t guess
                </button>
              )}
            </div>
            {hint && (
              <p className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-sm text-[#334155]">
                <span className="font-semibold">Coach hint:</span> {hint}
              </p>
            )}
          </form>
        </section>

        <aside className="card space-y-4 p-5" aria-label="Live MEDDPICC signal rail">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Live MEDDPICC signal rail</p>
            <p className="mt-1 text-sm text-[#64748B]">
              Bars reach 4 only when a buyer states the signal. Click a verified signal to see the quote.
            </p>
          </div>

          <div className="space-y-2">
            {SIGNAL_IDS.map((id) => {
              const binding = sim.bindings[id];
              const isTarget = sim.targetSignals.includes(id);
              const isVerified = binding.bars === 4;
              const letter = signalLabel(id).charAt(0).toUpperCase();
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!isVerified}
                  onClick={() => jumpToQuote(binding.transcript_turn_id)}
                  className="flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left disabled:cursor-default"
                  style={{
                    borderStyle: binding.bars === 1 ? 'dashed' : 'solid',
                    borderColor: isVerified ? BRAND.emerald : BRAND.hairline,
                    background: isVerified ? BRAND.emeraldTint : '#FFFFFF'
                  }}
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-extrabold"
                    style={{ background: '#F1F5F9', color: rubric.color }}
                  >
                    {letter}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{signalLabel(id)}</span>
                    <span className="block text-[11px] text-[#64748B]">
                      {isTarget ? 'Target' : 'Context'}
                      {isVerified ? ' · verbatim proof, click to view' : ''}
                    </span>
                  </span>
                  <SignalBars bars={binding.bars} color={rubric.color} label={signalLabel(id)} />
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold text-[#475569]">
              <span>Targets verified</span>
              <span>
                {verified} of {targetTotal}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPercent}%`, background: rubric.color }} />
            </div>
          </div>

          {verified === targetTotal && !isBoss && (
            <p className="rounded-xl bg-[#ECFDF5] px-3 py-2 text-sm font-semibold text-[#047857]">
              Every target signal has buyer proof. Finish the drill to record it.
            </p>
          )}

          <button
            type="button"
            onClick={finish}
            disabled={locked}
            className="spectrum-cta w-full rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {isBoss ? 'Grade boss fight' : 'Finish drill'}
          </button>
          <p className="text-center text-[11px] text-[#64748B]">
            Passing needs {isBoss ? rubric.boss_pass_min : rubric.core_gate_pass_min}% and {isBoss ? 'zero auto-fail flags' : 'no auto-fail check'}.
          </p>
        </aside>
      </div>
    </div>
  );
}

function TurnBubble({ turn, highlighted, color }: { turn: Turn; highlighted: boolean; color: string }) {
  const isLearner = turn.speaker === 'learner';
  const chip =
    turn.reveal === 'verbatim'
      ? 'Verbatim proof'
      : turn.reveal === 'partial'
        ? 'Partial signal'
        : turn.objection
          ? 'Objection'
          : null;

  return (
    <div id={`dm-${turn.id}`} className={`flex ${isLearner ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed transition-colors"
        style={{
          background: highlighted ? BRAND.emeraldTint : isLearner ? '#F1F5F9' : '#FFFFFF',
          borderColor: highlighted ? BRAND.emerald : BRAND.hairline,
          boxShadow: highlighted ? `0 0 0 3px ${BRAND.emerald}33` : undefined,
          borderLeft: !isLearner ? `3px solid ${color}` : undefined
        }}
      >
        <p className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
          <span>{turn.speakerRole}</span>
          {chip && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{
                background: turn.reveal === 'verbatim' ? BRAND.emeraldTint : '#F1F5F9',
                color: turn.reveal === 'verbatim' ? BRAND.emeraldText : '#475569'
              }}
            >
              {chip}
            </span>
          )}
        </p>
        <p className="text-[#111827]">{turn.content}</p>
      </div>
    </div>
  );
}

function Debrief({
  grade,
  record,
  tier,
  isBoss,
  cluster,
  signalLabels,
  color,
  onRetake
}: {
  grade: GradeResult;
  record: SessionRecord;
  tier: Tier;
  isBoss: boolean;
  cluster: { display_name: string; marquee_lineage: { label: string; url: string }[] };
  signalLabels: Record<SignalId, string>;
  color: string;
  onRetake: () => void;
}) {
  const quoteFor = (turnId: string | null) => record.transcript.find((turn) => turn.id === turnId)?.content;

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="h-1" style={{ background: grade.passed ? BRAND.emerald : BRAND.red }} />
        <div className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div className="flex items-center gap-4">
            {grade.passed ? (
              <CheckCircle2 className="h-10 w-10 text-[#10B981]" aria-hidden="true" />
            ) : (
              <XCircle className="h-10 w-10 text-[#EF4444]" aria-hidden="true" />
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                {isBoss ? 'Boss fight result' : 'Drill result'}
              </p>
              <h2 className="text-2xl font-extrabold">{grade.passed ? 'Passed' : 'Not yet'}</h2>
              <p className="text-sm text-[#64748B]">
                Score {grade.score}% against a {grade.gate}% gate · {grade.verifiedCount} of {grade.targetSignals.length} signals verified with buyer proof
              </p>
            </div>
          </div>
          <p className="text-5xl font-extrabold tabular-nums" style={{ color }}>
            {grade.score}%
          </p>
        </div>
      </section>

      {grade.autoFails.length > 0 && (
        <section className="rounded-[20px] border border-[#EF4444] bg-[#FEF2F2] p-5" aria-label="Auto-fail red flags">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B91C1C]">Auto-fail red flags</p>
          <ul className="space-y-2">
            {grade.autoFails.map((flag) => (
              <li key={flag.id} className="flex items-start gap-2 text-sm text-[#7F1D1D]">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold">{flag.label}.</span> {flag.description}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-6">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Evidence by signal</p>
        <div className="space-y-3">
          {grade.targetSignals.map((id) => {
            const binding = grade.bindings[id];
            const quote = binding.bars === 4 ? quoteFor(binding.transcript_turn_id) : undefined;
            return (
              <div key={id} className="rounded-2xl border p-4" style={{ borderStyle: quote ? 'solid' : 'dashed', borderColor: quote ? BRAND.emerald : '#CBD5E1' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{signalLabels[id]}</p>
                  <SignalBars bars={binding.bars} color={color} label={signalLabels[id]} />
                </div>
                {quote ? (
                  <p className="mt-2 text-sm italic text-[#334155]">&ldquo;{quote}&rdquo;</p>
                ) : (
                  <p className="mt-2 text-sm text-[#64748B]">
                    {binding.bars === 3 ? 'Partial signal only. The buyer acknowledged the issue without a metric or authority.' : 'No verbatim buyer evidence yet.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Logo lineage X-ray</p>
        <p className="mt-1 text-sm text-[#64748B]">Playbooks behind this {cluster.display_name} motion.</p>
        <ul className="mt-3 space-y-2">
          {cluster.marquee_lineage.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noreferrer noopener" className="text-sm font-semibold text-[#2563EB] underline-offset-4 hover:underline">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onRetake} className="rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-sm font-semibold hover:bg-[#F8FAFC]">
          Retake
        </button>
        <Link href="/dashboard" className="spectrum-cta rounded-full px-5 py-2 text-sm font-bold text-white">
          Back to dashboard
        </Link>
        {isBoss && grade.passed && tier < 4 && (
          <span className="text-sm font-semibold text-[#047857]">Pillar 0{tier + 1} is now unlocked.</span>
        )}
      </div>
    </div>
  );
}
