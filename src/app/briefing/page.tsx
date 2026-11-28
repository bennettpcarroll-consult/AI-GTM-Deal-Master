'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { MarketLessonCard } from '@/components/market-lesson';
import { QuestionFlow } from '@/components/question-flow';
import { FocusScreen, Loading, StepBar } from '@/components/ui';
import { loadCurriculum } from '@/lib/curriculum/load';
import { recordActivity } from '@/lib/engagement';
import { lessonQuizQuestions } from '@/lib/questions';
import { useAppState } from '@/lib/use-app-state';

/** The market briefing for the active path: four visual cards, then a three-question check. First node on Pillar 01. */
export default function BriefingPage() {
  const router = useRouter();
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const [step, setStep] = useState<'lesson' | 'quiz'>('lesson');
  const [card, setCard] = useState(0);

  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);
  useEffect(() => {
    if (state && !trajectory) router.replace('/start');
  }, [state, trajectory, router]);

  if (!state || !trajectory) return <Loading />;
  const cluster = curriculum.clusters[trajectory.clusterId];
  const cards = cluster.lesson.cards;
  const progressMax = cards.length + cluster.lesson.quiz.length;

  const finish = () => {
    update((current) =>
      recordActivity({ ...current, lessonsDone: [...new Set([...(current.lessonsDone ?? []), cluster.id])] }, { reps: 1, proofs: 0 })
    );
    router.push('/path');
  };

  if (step === 'lesson') {
    const last = card === cards.length - 1;
    return (
      <FocusScreen
        top={<StepBar exitHref={card === 0 ? '/path' : undefined} onBack={card === 0 ? undefined : () => setCard(card - 1)} value={card} max={progressMax} label="Briefing progress" />}
        footer={
          <div className="flex flex-col items-center gap-2">
            <button type="button" className="btn-lit w-full" onClick={() => (last ? setStep('quiz') : setCard(card + 1))}>
              {last ? 'Check what you learned' : 'Next'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
            {/* Experienced sellers can go straight to the buyer. The briefing stays on the path for later. */}
            {card === 0 && (
              <Link href="/room/1/drill-1" className="t-small min-h-[44px] content-center font-semibold text-slate underline-offset-2 hover:text-ink hover:underline">
                Skip to the buyer room
              </Link>
            )}
          </div>
        }
      >
        <div key={card} className="animate-rise pt-6">
          <MarketLessonCard curriculum={curriculum} cluster={cluster} index={card} eyebrow={`Market briefing · ${card + 1} of ${cards.length}`} />
        </div>
      </FocusScreen>
    );
  }

  if (step === 'quiz') {
    return (
      <QuestionFlow
        key="quiz"
        questions={lessonQuizQuestions(cluster.lesson, cluster.display_name)}
        progressLabel="Briefing progress"
        stepLabel="Briefing check"
        progress={(done) => ({ value: cards.length + done, max: progressMax })}
        onBack={() => {
          setCard(cluster.lesson.cards.length - 1);
          setStep('lesson');
        }}
        onDone={finish}
      />
    );
  }

  return <Loading />;
}
