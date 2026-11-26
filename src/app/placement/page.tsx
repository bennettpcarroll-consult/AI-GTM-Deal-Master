'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, Flag, ScanSearch } from 'lucide-react';
import { Glyph, IconTile } from '@/components/glyph';
import { QuestionFlow } from '@/components/question-flow';
import { FocusScreen, Loading, StepBar } from '@/components/ui';
import { FAMILY_COLOR, FAMILY_TINT } from '@/lib/brand';
import { loadCurriculum } from '@/lib/curriculum/load';
import { repToQuestion } from '@/lib/questions';
import { diagnosticByFamily, diagnosticQuestions, familyOf } from '@/lib/skills';
import { useAppState } from '@/lib/use-app-state';

type Step = 'diagnostic-intro' | 'diagnostic' | 'map';

/** The optional 2-minute placement check, opened from the path. It never blocks onboarding. */
export default function PlacementPage() {
  const router = useRouter();
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const [step, setStep] = useState<Step>('diagnostic-intro');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const diagnostic = useMemo(
    () =>
      diagnosticQuestions(curriculum).map((rep) =>
        repToQuestion(rep, curriculum.families.find((family) => family.id === familyOf(curriculum, rep.skill.id))?.display_name ?? '')
      ),
    [curriculum]
  );

  if (!state) return <Loading />;

  const finish = (diagnosticAnswers: Record<string, boolean>) => {
    update((current) => ({ ...current, diagnostic: { completedAt: new Date().toISOString(), answers: diagnosticAnswers } }));
    router.push('/path');
  };

  if (step === 'diagnostic-intro') {
    return (
      <FocusScreen
        top={<StepBar exitHref="/path" value={0} max={diagnostic.length + 1} label="Placement progress" />}
        footer={
          <button type="button" className="btn-lit" onClick={() => setStep('diagnostic')}>
            Start the check
          </button>
        }
      >
        <div className="flex animate-rise flex-col gap-3 pt-7">
          <IconTile tint="#f6ebff" color="#8a3cc7" size="lg">
            <ScanSearch className="h-8 w-8" strokeWidth={1.75} />
          </IconTile>
          <p className="t-label mt-2">Placement check · 2 minutes</p>
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
        progressLabel="Placement progress"
        stepLabel="Placement check"
        progress={(done) => ({ value: done + 1, max: diagnostic.length + 1 })}
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
    const ratio = (family: (typeof byFamily)[number]) => family.correct / Math.max(family.total, 1);
    const lowest = Math.min(...byFamily.map(ratio));
    // Only a family that dropped a question is a gap. A perfect run has none, and ties are all named.
    const gaps = lowest < 1 ? byFamily.filter((family) => ratio(family) === lowest) : [];
    const gapIds = new Set(gaps.map((family) => family.familyId));
    const gapNames = gaps.map((family) => family.label.toLowerCase());
    const gapText = gapNames.length <= 1 ? gapNames[0] : `${gapNames.slice(0, -1).join(', ')} and ${gapNames[gapNames.length - 1]}`;
    const total = byFamily.reduce((sum, family) => sum + family.correct, 0);
    return (
      <FocusScreen
        top={<StepBar value={1} max={1} label="Placement progress" />}
        footer={
          <button type="button" className="btn-lit" onClick={() => finish(answers)}>
            Back to my path <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        }
      >
        <div className="flex animate-rise flex-col gap-3 pt-7">
          <p className="t-label">Placement check · Your skill map</p>
          <h1 className="t-title">
            {gaps.length === 0 ? `${total} of ${diagnostic.length}. Sharp judgement.` : `${total} of ${diagnostic.length} strong moves.`}
          </h1>
          <p className="t-lede">
            {gaps.length === 0
              ? 'No gaps in judgement. Now prove it with buyers: pillars unlock with buyer proof, not quiz answers, so strong sellers clear Pillar 01 fast.'
              : `Your ${gaps.length === 1 ? 'biggest gap is' : 'gaps are'} ${gapText}, so your daily reps start there. Pillars unlock with buyer proof, not quiz answers, so everyone begins at Pillar 01.`}
          </p>
        </div>
        <ul className="mt-7 flex flex-col gap-2.5">
          {byFamily.map((family) => {
            const meta = curriculum.families.find((candidate) => candidate.id === family.familyId);
            const color = FAMILY_COLOR[family.familyId] ?? '#5e6672';
            const isGap = gapIds.has(family.familyId);
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
