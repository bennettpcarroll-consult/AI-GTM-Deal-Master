'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Award, GraduationCap } from 'lucide-react';
import { QuestionFlow } from '@/components/question-flow';
import { FocusScreen, Loading } from '@/components/ui';
import { loadCurriculum } from '@/lib/curriculum/load';
import { dayKey, recordActivity } from '@/lib/engagement';
import { FINAL_REVIEW_PASS } from '@/lib/path';
import { finalReviewQuestions } from '@/lib/review';
import { findArcBeat, queueMisses } from '@/lib/sharpen';
import { bossesPassed, recordFinalReview } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';

/** The one bigger review at the end of the course: eight new situations across all four pillars. */
export default function ReviewPage() {
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number; passed: boolean } | null>(null);
  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);
  const questions = useMemo(() => (trajectory ? finalReviewQuestions(curriculum, trajectory) : []), [curriculum, trajectory?.id]);

  if (!state) return <Loading />;
  if (!trajectory || bossesPassed(trajectory) < 4) {
    return (
      <FocusScreen top={<span />} footer={<Link href="/path" className="btn-lit">Back to my path</Link>}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <h1 className="t-title">Final review is locked</h1>
          <p className="t-lede">Finish all four pillars and the final review opens here.</p>
        </div>
      </FocusScreen>
    );
  }

  if (result) {
    return (
      <FocusScreen
        top={<span />}
        footer={
          <div className="flex flex-col gap-2">
            <Link href="/path" className="btn-lit">
              {result.passed ? 'See your certificate' : 'Back to my path'}
            </Link>
            {!result.passed && (
              <button
                type="button"
                className="btn-quiet w-full"
                onClick={() => {
                  setResult(null);
                  setAttempt(attempt + 1);
                }}
              >
                Try the review again
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-1 animate-rise flex-col items-center justify-center gap-3 text-center">
          <span className="grid h-20 w-20 animate-pop place-items-center rounded-full bg-profit-soft text-profit-ink" aria-hidden="true">
            {result.passed ? <Award className="h-10 w-10" /> : <GraduationCap className="h-10 w-10" />}
          </span>
          <p className="t-label">Final review</p>
          <h1 className="t-display">
            {result.correct} of {result.total}
          </h1>
          <p className="t-lede">{result.passed ? 'Course complete. Your deal playbook certificate is unlocked.' : `You need ${Math.ceil(result.total * FINAL_REVIEW_PASS)} to pass. The moves you missed are in your daily reps.`}</p>
        </div>
      </FocusScreen>
    );
  }

  return (
    <QuestionFlow
      key={attempt}
      questions={questions}
      exitHref="/path"
      progressLabel="Final review progress"
      stepLabel="Final review"
      onDone={(answers) => {
        const correct = Object.values(answers).filter(Boolean).length;
        const total = questions.length;
        const passed = correct >= Math.ceil(total * FINAL_REVIEW_PASS);
        const misses = Object.entries(answers)
          .filter(([id, value]) => !value && id.startsWith('beat:'))
          .flatMap(([id]) => {
            const found = findArcBeat(curriculum, trajectory.id, id.slice('beat:'.length));
            return found ? [{ beatId: found.beat.id, skillId: found.beat.skill }] : [];
          });
        update((current) =>
          recordActivity(queueMisses(recordFinalReview(current, trajectory.id, Math.round((100 * correct) / total), passed), trajectory.id, misses, dayKey()), { reps: 1, proofs: 0 })
        );
        setResult({ correct, total, passed });
      }}
    />
  );
}
