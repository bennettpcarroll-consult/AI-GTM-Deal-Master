'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, Check, Flag, ScanSearch } from 'lucide-react';
import { Glyph, IconTile } from '@/components/glyph';
import { MarketLessonCard } from '@/components/market-lesson';
import { QuestionFlow } from '@/components/question-flow';
import { FocusScreen, Loading, StepBar } from '@/components/ui';
import { FAMILY_COLOR, FAMILY_TINT, LAYER_STYLE } from '@/lib/brand';
import { loadCurriculum } from '@/lib/curriculum/load';
import { CLUSTER_IDS, VERTICAL_IDS, type ClusterId, type VerticalId } from '@/lib/curriculum/schema';
import { recordActivity } from '@/lib/engagement';
import { lessonQuizQuestions, repToQuestion } from '@/lib/questions';
import { diagnosticByFamily, diagnosticQuestions, familyOf } from '@/lib/skills';
import { addOrActivateTrajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { placementCreditKeys } from '@/lib/views';

type Step = 'cluster' | 'vertical' | 'lesson' | 'quiz' | 'diagnostic-intro' | 'diagnostic' | 'map';

export default function StartPage() {
  const router = useRouter();
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const [step, setStep] = useState<Step>('cluster');
  const [clusterId, setClusterId] = useState<ClusterId | null>(null);
  const [verticalId, setVerticalId] = useState<VerticalId | null>(null);
  const [card, setCard] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const diagnostic = useMemo(
    () =>
      diagnosticQuestions(curriculum).map((rep) =>
        repToQuestion(rep, curriculum.families.find((family) => family.id === familyOf(curriculum, rep.skill.id))?.display_name ?? '')
      ),
    [curriculum]
  );

  if (!state) return <Loading />;
  const needsDiagnostic = !state.diagnostic;
  const cluster = clusterId ? curriculum.clusters[clusterId] : null;
  const vertical = verticalId ? curriculum.verticals[verticalId] : null;
  const totalSteps = needsDiagnostic ? 6 : 4;
  const stepNumber = { cluster: 1, vertical: 2, lesson: 3, quiz: 4, 'diagnostic-intro': 5, diagnostic: 5, map: 6 }[step];

  const finish = (diagnosticAnswers: Record<string, boolean> | null) => {
    if (!clusterId || !verticalId) return;
    update((current) => {
      let next = addOrActivateTrajectory(current, clusterId, verticalId, placementCreditKeys(curriculum));
      next = { ...next, lessonsDone: [...new Set([...(next.lessonsDone ?? []), clusterId])] };
      if (diagnosticAnswers) next = { ...next, diagnostic: { completedAt: new Date().toISOString(), answers: diagnosticAnswers } };
      return recordActivity(next, { reps: 1, proofs: 0 });
    });
    router.push('/path');
  };

  if (step === 'cluster' || step === 'vertical') {
    const isCluster = step === 'cluster';
    const options = isCluster
      ? CLUSTER_IDS.map((id) => {
          const item = curriculum.clusters[id];
          const style = LAYER_STYLE[item.stack_order] ?? LAYER_STYLE[1]!;
          return { id, title: item.display_name, sub: item.pricing_unit.units.slice(0, 2).join(' · '), glyph: item.glyph, ...style };
        })
      : VERTICAL_IDS.map((id) => {
          const item = curriculum.verticals[id];
          return { id, title: item.short_name, sub: item.display_name, glyph: item.glyph, tint: '#f6ebff', ink: '#8a3cc7' };
        });
    const selected = isCluster ? clusterId : verticalId;
    return (
      <FocusScreen
        top={
          <StepBar
            exitHref={isCluster && state.trajectories.length > 0 ? '/path' : undefined}
            onBack={isCluster ? undefined : () => setStep('cluster')}
            value={stepNumber - 1}
            max={totalSteps}
            label="Setup progress"
          />
        }
        footer={
          <button
            type="button"
            className="btn-lit"
            disabled={!selected}
            onClick={() => {
              if (isCluster) setStep('vertical');
              else {
                setCard(0);
                setStep('lesson');
              }
            }}
          >
            Continue
          </button>
        }
      >
        <div key={step} className="flex animate-rise flex-col gap-3 pt-7">
          <p className="t-label">Step {stepNumber} of {totalSteps}</p>
          <h1 className="t-title">{isCluster ? 'What do you sell?' : 'Who do you sell to?'}</h1>
          <p className="t-lede">{isCluster ? 'Pick the AI category you want to master.' : 'Your buyers, their objections and their paper process.'}</p>
        </div>
        <div className="mt-7 flex flex-col gap-2.5" role="group" aria-label={isCluster ? 'AI categories' : 'Industries'}>
          {options.map((option) => {
            const pressed = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className="choice"
                aria-pressed={pressed}
                onClick={() => (isCluster ? setClusterId(option.id as ClusterId) : setVerticalId(option.id as VerticalId))}
              >
                <IconTile tint={option.tint} color={option.ink}>
                  <Glyph name={option.glyph} className="h-6 w-6" />
                </IconTile>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="t-item">{option.title}</span>
                  <span className="t-small">{option.sub}</span>
                </span>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${pressed ? 'bg-people-ink text-white' : 'border-2 border-rule-strong'}`}
                  aria-hidden="true"
                >
                  {pressed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
        {!isCluster && vertical && (
          <div className="panel mt-4 flex animate-rise flex-col gap-1.5 p-4">
            <p className="t-label">What you will face</p>
            <p className="t-body">{vertical.dominant_friction}</p>
          </div>
        )}
      </FocusScreen>
    );
  }

  if (step === 'lesson' && cluster) {
    const cards = cluster.lesson.cards;
    const last = card === cards.length - 1;
    return (
      <FocusScreen
        top={<StepBar onBack={() => (card === 0 ? setStep('vertical') : setCard(card - 1))} value={card + 1} max={cards.length} label="Market lesson progress" />}
        footer={
          <button type="button" className="btn-lit" onClick={() => (last ? setStep('quiz') : setCard(card + 1))}>
            {last ? 'Check what you learned' : 'Next'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        }
      >
        <div key={card} className="animate-rise pt-6">
          <MarketLessonCard curriculum={curriculum} cluster={cluster} index={card} />
        </div>
      </FocusScreen>
    );
  }

  if (step === 'quiz' && cluster) {
    return (
      <QuestionFlow
        key="quiz"
        questions={lessonQuizQuestions(cluster.lesson, cluster.display_name)}
        progressLabel="Lesson check progress"
        onBack={() => {
          setCard(cluster.lesson.cards.length - 1);
          setStep('lesson');
        }}
        onDone={() => (needsDiagnostic ? setStep('diagnostic-intro') : finish(null))}
      />
    );
  }

  if (step === 'diagnostic-intro') {
    return (
      <FocusScreen
        top={<StepBar onBack={() => setStep('quiz')} value={4} max={totalSteps} label="Setup progress" />}
        footer={
          <button type="button" className="btn-lit" onClick={() => setStep('diagnostic')}>
            Start the diagnostic
          </button>
        }
      >
        <div className="flex animate-rise flex-col gap-3 pt-7">
          <IconTile tint="#f6ebff" color="#8a3cc7" size="lg">
            <ScanSearch className="h-8 w-8" strokeWidth={1.75} />
          </IconTile>
          <p className="t-label mt-2">Step 5 of 6</p>
          <h1 className="t-title">Find your starting point.</h1>
          <p className="t-lede">{curriculum.diagnostic.intro}</p>
        </div>
        <div className="mt-8 flex flex-col gap-2.5">
          {curriculum.families.map((family) => (
            <div key={family.id} className="flex items-center gap-4 rounded-panel border border-hairline p-4">
              <IconTile tint={FAMILY_TINT[family.id] ?? '#f4f5f7'} color={FAMILY_COLOR[family.id] ?? '#5e6672'}>
                <Glyph name={family.glyph} className="h-6 w-6" />
              </IconTile>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="t-item">{family.display_name}</span>
                <span className="t-small">{family.skills.length} skills · 3 situations</span>
              </div>
            </div>
          ))}
        </div>
      </FocusScreen>
    );
  }

  if (step === 'diagnostic') {
    return (
      <QuestionFlow
        key="diagnostic"
        questions={diagnostic}
        progressLabel="Diagnostic progress"
        onBack={() => setStep('diagnostic-intro')}
        onDone={(results) => {
          setAnswers(results);
          setStep('map');
        }}
      />
    );
  }

  if (step === 'map') {
    const byFamily = diagnosticByFamily(curriculum, answers);
    const weakest = [...byFamily].sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
    const total = byFamily.reduce((sum, family) => sum + family.correct, 0);
    return (
      <FocusScreen
        top={<StepBar value={6} max={6} label="Setup progress" />}
        footer={
          <button type="button" className="btn-lit" onClick={() => finish(answers)}>
            Start my path <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        }
      >
        <div className="flex animate-rise flex-col gap-3 pt-7">
          <p className="t-label">Your skill map</p>
          <h1 className="t-title">
            {total} of {diagnostic.length} strong moves.
          </h1>
          <p className="t-lede">
            Your biggest gap is {weakest?.label.toLowerCase()}. You start at Pillar 01, and every pillar builds on the one before.
          </p>
        </div>
        <ul className="mt-7 flex flex-col gap-2.5">
          {byFamily.map((family) => {
            const meta = curriculum.families.find((candidate) => candidate.id === family.familyId);
            const color = FAMILY_COLOR[family.familyId] ?? '#5e6672';
            const isGap = family.familyId === weakest?.familyId;
            return (
              <li
                key={family.familyId}
                className={`flex items-center gap-4 rounded-panel border-2 bg-paper p-4 ${isGap ? '' : 'border-transparent shadow-card'}`}
                style={isGap ? { borderColor: color } : undefined}
              >
                {meta && (
                  <IconTile tint={FAMILY_TINT[family.familyId] ?? '#f4f5f7'} color={color}>
                    <Glyph name={meta.glyph} className="h-6 w-6" />
                  </IconTile>
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="t-item">{family.label}</span>
                    {isGap && (
                      <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white" style={{ background: color }}>
                        <Flag className="h-3 w-3" aria-hidden="true" /> Focus
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-deep" aria-hidden="true">
                      <span className="block h-full rounded-full" style={{ width: `${(family.correct / Math.max(family.total, 1)) * 100}%`, background: color }} />
                    </span>
                    <span className="t-small w-14 text-right font-semibold tabular-nums">
                      {family.correct} of {family.total}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="t-small mt-4">
          The diagnostic can mark a skill as practiced. Proven and certified are earned only in live drills, with buyer proof.
        </p>
      </FocusScreen>
    );
  }

  return <Loading />;
}
