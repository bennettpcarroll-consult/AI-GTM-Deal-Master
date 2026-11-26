'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { QuestionFlow } from '@/components/question-flow';
import { FocusScreen, Loading } from '@/components/ui';
import { loadCurriculum } from '@/lib/curriculum/load';
import { currentEngagement, dayKey, recordActivity } from '@/lib/engagement';
import { repToQuestion, sharpenQuestion } from '@/lib/questions';
import { dueSharpen, findArcBeat, reviewSharpen } from '@/lib/sharpen';
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
    const day = dayKey();
    // Missed deal-room moves that are due come first (spaced retrieval), capped so a set stays short and mixed.
    const due = trajectory && round === 0 ? dueSharpen(state, trajectory.id, day) : [];
    const sharpen = due.flatMap((item) => {
      const found = findArcBeat(curriculum, item.trajectoryId, item.beatId);
      return found ? [sharpenQuestion(found, day, item.failure ? curriculum.failureModes[item.failure]?.lesson : undefined)] : [];
    });
    const reps = dailyReps(curriculum, mastery, `${day}-${round}`, 5 - sharpen.length).map((rep) =>
      repToQuestion(rep, curriculum.families.find((family) => family.id === familyOf(curriculum, rep.skill.id))?.display_name ?? '')
    );
    // Interleave: a missed move, then a skill rep, so the set never runs the same kind of question back to back.
    const mixed = [];
    for (let i = 0; i < Math.max(sharpen.length, reps.length); i += 1) {
      if (sharpen[i]) mixed.push(sharpen[i]!);
      if (reps[i]) mixed.push(reps[i]!);
    }
    return mixed;
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
            {engagement.streak} day streak
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
        const beats = Object.fromEntries(
          Object.entries(answers)
            .filter(([id]) => id.startsWith('beat:'))
            .map(([id, value]) => [id.slice('beat:'.length), value])
        );
        const correctSkills = Object.entries(answers)
          .filter(([id, value]) => value && !id.startsWith('beat:'))
          .map(([skill]) => skill);
        const correct = Object.values(answers).filter(Boolean).length;
        update((current) => {
          const reviewed = trajectory ? reviewSharpen(current, trajectory.id, beats, dayKey()) : current;
          return recordActivity(reviewed, { reps: questions.length, proofs: 0, skills: correctSkills });
        });
        setResult({ correct, total: questions.length });
      }}
    />
  );
}
