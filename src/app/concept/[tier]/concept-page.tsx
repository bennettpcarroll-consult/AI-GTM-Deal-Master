'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Check, Lightbulb, X } from 'lucide-react';
import { IconTile } from '@/components/glyph';
import { QuestionFlow } from '@/components/question-flow';
import { FocusScreen, Loading, StepBar } from '@/components/ui';
import { PILLAR_TINT } from '@/lib/brand';
import { loadCurriculum } from '@/lib/curriculum/load';
import { TIERS, type Tier } from '@/lib/curriculum/schema';
import { arcPillar } from '@/lib/deal-room';
import { recordActivity } from '@/lib/engagement';
import { useAppState } from '@/lib/use-app-state';

/**
 * The worked example that opens a pillar: one idea, a weak line beside a strong one, then a
 * single retrieval check. It takes under a minute, so the drills start from a clear model.
 */
export function ConceptPage() {
  const params = useParams<{ tier: string }>();
  const router = useRouter();
  const { state, update } = useAppState();
  const [step, setStep] = useState<'card' | 'check'>('card');
  const curriculum = loadCurriculum();
  const tier = Number(params.tier) as Tier;
  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);

  if (!state) return <Loading />;
  const pillar = trajectory && (TIERS as readonly number[]).includes(tier) ? arcPillar(curriculum, trajectory.clusterId, trajectory.verticalId, tier) : null;
  if (!trajectory || !pillar) {
    return (
      <FocusScreen top={<span />} footer={<Link href="/path" className="btn-lit">Back to my path</Link>}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <h1 className="t-title">No concept card here</h1>
          <p className="t-lede">This path does not have a concept card for that pillar yet.</p>
        </div>
      </FocusScreen>
    );
  }
  const rubric = curriculum.rubrics[tier];
  const color = rubric.text_color;
  const tint = PILLAR_TINT[tier];
  const { concept } = pillar;

  const finish = () => {
    update((current) =>
      recordActivity({ ...current, conceptsDone: [...new Set([...(current.conceptsDone ?? []), `${trajectory.id}:${tier}`])] }, { reps: 1, proofs: 0 })
    );
    router.push('/path');
  };

  if (step === 'check') {
    // One retrieval question: spot the strong line in a fresh pairing, so the idea is used, not just read.
    return (
      <QuestionFlow
        questions={[
          {
            id: `concept-${tier}`,
            kicker: `Pillar ${rubric.pillar} · The big idea`,
            prompt: concept.title,
            ask: 'Which line puts this idea to work?',
            options: tier % 2 === 1 ? [concept.strong, concept.weak] : [concept.weak, concept.strong],
            answer: tier % 2 === 1 ? 0 : 1,
            why: concept.body
          }
        ]}
        onBack={() => setStep('card')}
        progressLabel="Concept progress"
        onDone={finish}
      />
    );
  }

  return (
    <FocusScreen
      top={<StepBar exitHref="/path" value={0} max={2} label="Concept progress" />}
      footer={
        <button type="button" className="btn-lit" onClick={() => setStep('check')}>
          Check the idea <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      }
    >
      <div className="flex animate-rise flex-col gap-3 pt-6">
        <IconTile tint={tint} color={color} size="lg">
          <Lightbulb className="h-8 w-8" strokeWidth={1.75} />
        </IconTile>
        <p className="t-label mt-1" style={{ color }}>
          Pillar {rubric.pillar} · {pillar.stage}
        </p>
        <h1 className="t-title">{concept.title}</h1>
        <p className="t-body text-charcoal">{concept.body}</p>
      </div>
      <section className="mt-6 flex flex-col gap-3 pb-2" aria-label="Worked example">
        <div className="rounded-panel bg-leak-soft p-4">
          <p className="t-label flex items-center gap-1.5 text-leak-ink">
            <X className="h-4 w-4" aria-hidden="true" /> Sounds fine, earns nothing
          </p>
          <p className="t-quote mt-1.5 text-[16px]">“{concept.weak}”</p>
        </div>
        <div className="rounded-panel bg-profit-soft p-4">
          <p className="t-label flex items-center gap-1.5 text-profit-ink">
            <Check className="h-4 w-4" aria-hidden="true" /> Elite
          </p>
          <p className="t-quote mt-1.5 text-[16px]">“{concept.strong}”</p>
        </div>
        <p className="t-small">
          At {curriculum.arcs[trajectory.id]?.account.name ?? 'the account'}, you will meet {pillar.cast.filter((member) => pillar.drills.some((drill) => drill.beats.some((beat) => beat.speaker === member.id))).map((member) => member.name.split(' ')[0]).join(', ')} in this pillar.
        </p>
      </section>
    </FocusScreen>
  );
}
