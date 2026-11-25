'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { QuestionFlow } from '@/components/question-flow';
import { FocusScreen, Loading } from '@/components/ui';
import { loadCurriculum } from '@/lib/curriculum/load';
import { currentEngagement, dayKey, DAILY_GOAL, recordActivity } from '@/lib/engagement';
import { repToQuestion } from '@/lib/questions';
import { dailyReps, familyOf, masteryMap } from '@/lib/skills';
import { useAppState } from '@/lib/use-app-state';

export default function RepsPage() {
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);

  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);
  const questions = useMemo(() => {
    if (!state) return [];
    const mastery = masteryMap(curriculum, state, trajectory);
    return dailyReps(curriculum, mastery, `${dayKey()}-${round}`).map((rep) =>
      repToQuestion(rep, curriculum.families.find((family) => family.id === familyOf(curriculum, rep.skill.id))?.display_name ?? '')
    );
    // Picked once per round, so the set does not reshuffle while the learner answers.
  }, [Boolean(state), round]);

  if (!state) return <Loading />;

  if (result) {
    const engagement = currentEngagement(state);
    return (
      <FocusScreen
        top={<span />}
        footer={
          <div className="flex flex-col gap-2">
            <Link href="/path" className="btn-lit">
              Back to my path
            </Link>
            <button
              type="button"
              className="btn-quiet w-full"
              onClick={() => {
                setResult(null);
                setRound(round + 1);
              }}
            >
              Another set
            </button>
          </div>
        }
      >
        <div className="flex flex-1 animate-rise flex-col items-center justify-center gap-4 text-center">
          <span className="grid h-20 w-20 animate-pop place-items-center rounded-full bg-value-soft text-value-ink" aria-hidden="true">
            <Flame className="h-10 w-10" fill="currentColor" />
          </span>
          <p className="t-label">Set complete</p>
          <h1 className="t-display">
            {result.correct} of {result.total}
          </h1>
          <p className="t-lede">strong moves picked</p>
          <p className="t-body">
            {engagement.streak} day streak · {Math.min(engagement.repsToday, DAILY_GOAL)} of {DAILY_GOAL} reps today
          </p>
        </div>
      </FocusScreen>
    );
  }

  return (
    <QuestionFlow
      key={round}
      questions={questions}
      exitHref="/path"
      progressLabel="Reps progress"
      onDone={(answers) => {
        const correctSkills = Object.entries(answers)
          .filter(([, value]) => value)
          .map(([skill]) => skill);
        update((current) => recordActivity(current, { reps: questions.length, proofs: 0, skills: correctSkills }));
        setResult({ correct: correctSkills.length, total: questions.length });
      }}
    />
  );
}
