'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { QuestionFlow } from '@/components/question-flow';
import { Bars, FocusScreen, Loading, StepBar } from '@/components/ui';
import { FAMILY_COLOR } from '@/lib/brand';
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
      ? CLUSTER_IDS.map((id) => ({ id, title: curriculum.clusters[id].display_name, sub: curriculum.clusters[id].pricing_unit.model }))
      : VERTICAL_IDS.map((id) => ({ id, title: curriculum.verticals[id].short_name, sub: curriculum.verticals[id].display_name }));
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
    const current = cards[card];
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
        <div key={card} className="flex animate-rise flex-col gap-3 pt-7">
          <p className="t-label">Market fundamentals · {cluster.display_name}</p>
          <p className="font-display text-[15px] font-bold text-people-ink">
            {card + 1} of {cards.length}
          </p>
          <h1 className="t-title">{current?.title}</h1>
          <p className="t-body text-[18px] leading-[1.55] text-charcoal">{current?.body}</p>
        </div>
        {last && (
          <div className="card mt-8 flex flex-col gap-3 p-5">
            <p className="t-label">Skills that win in {cluster.display_name}</p>
            <ul className="flex flex-wrap gap-2">
              {cluster.priority_skills.map((id) => {
                const skill = curriculum.skills.find((candidate) => candidate.id === id);
                return (
                  <li key={id} className="rounded-full bg-deep px-3 py-1.5 text-[13px] font-semibold">
                    {skill?.code} {skill?.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
          <p className="t-label">Step 5 of 6</p>
          <h1 className="t-title">Find your starting point.</h1>
          <p className="t-lede">{curriculum.diagnostic.intro}</p>
        </div>
        <div className="mt-8 flex flex-col gap-2.5">
          {curriculum.families.map((family) => (
            <div key={family.id} className="flex items-center gap-4 rounded-panel border border-hairline p-4">
              <span className="h-10 w-1.5 rounded-full" style={{ background: FAMILY_COLOR[family.id] }} aria-hidden="true" />
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
        <div className="mt-7 flex flex-col gap-3">
          {byFamily.map((family) => {
            const familySkills = curriculum.families.find((candidate) => candidate.id === family.familyId)?.skills ?? [];
            return (
              <section key={family.familyId} className="card flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="t-heading">{family.label}</h2>
                  <span className="t-small font-semibold tabular-nums">
                    {family.correct} of {family.total}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {familySkills.map((skill) => (
                    <span
                      key={skill.id}
                      className="flex items-center gap-2 rounded-full border border-hairline py-1 pl-2.5 pr-2 text-[12px] font-semibold"
                    >
                      {skill.code} {skill.label}
                      <Bars level={answers[skill.id] ? 2 : 1} color={FAMILY_COLOR[family.familyId] ?? '#5e6672'} label={skill.label} />
                    </span>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        <p className="t-small mt-4">
          The diagnostic can mark a skill as practiced. Proven and certified are earned only in live drills, with buyer proof.
        </p>
      </FocusScreen>
    );
  }

  return <Loading />;
}
