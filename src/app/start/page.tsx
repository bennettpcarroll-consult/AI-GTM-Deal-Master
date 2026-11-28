'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Glyph, IconTile } from '@/components/glyph';
import { FocusScreen, Loading, StepBar } from '@/components/ui';
import { LAYER_STYLE } from '@/lib/brand';
import { loadCurriculum } from '@/lib/curriculum/load';
import { CLUSTER_IDS, VERTICAL_IDS, type ClusterId, type VerticalId } from '@/lib/curriculum/schema';
import { addOrActivateTrajectory } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';
import { placementCreditKeys } from '@/lib/views';

type Step = 'cluster' | 'vertical';

/**
 * Two-step onboarding: what you sell, then who you sell to. Each card is a name and one muted
 * line, nothing more: the market briefing on the path teaches the rest, so it is never said twice.
 */
export default function StartPage() {
  const router = useRouter();
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const [step, setStep] = useState<Step>('cluster');
  const [clusterId, setClusterId] = useState<ClusterId | null>(null);
  const [verticalId, setVerticalId] = useState<VerticalId | null>(null);

  if (!state) return <Loading />;
  const isCluster = step === 'cluster';

  const finish = () => {
    if (!clusterId || !verticalId) return;
    update((current) => addOrActivateTrajectory(current, clusterId, verticalId, placementCreditKeys(curriculum)));
    router.push('/path');
  };

  return (
    <FocusScreen
      top={
        <StepBar
          exitHref={isCluster && state.trajectories.length > 0 ? '/path' : undefined}
          onBack={isCluster ? undefined : () => setStep('cluster')}
          value={isCluster ? 1 : 2}
          max={2}
          label="Setup progress"
        />
      }
      footer={
        <button
          type="button"
          className="btn-lit"
          disabled={isCluster ? !clusterId : !verticalId}
          onClick={() => (isCluster ? setStep('vertical') : finish())}
        >
          {isCluster ? 'Continue' : 'Start my path'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      }
    >
      <div key={step} className="flex animate-rise flex-col gap-3 pt-7">
        <p className="t-label">Step {isCluster ? 1 : 2} of 2</p>
        <h1 className="t-title">{isCluster ? 'What are you selling?' : 'Who are you selling into?'}</h1>
      </div>

      {isCluster ? (
        <div className="mt-6 flex flex-col gap-2.5" role="group" aria-label="AI categories">
          {CLUSTER_IDS.map((id) => {
            const item = curriculum.clusters[id];
            const style = LAYER_STYLE[item.stack_order] ?? LAYER_STYLE[1]!;
            const pressed = clusterId === id;
            return (
              <div key={id} className="flex flex-col gap-2">
                <button type="button" className="choice" aria-pressed={pressed} onClick={() => setClusterId(id)}>
                  <IconTile tint={style.tint} color={style.ink}>
                    <Glyph name={item.glyph} className="h-6 w-6" />
                  </IconTile>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="t-item">{item.display_name}</span>
                    <span className="t-small truncate">{item.card_vendors.join(' · ')}</span>
                  </span>
                  <Tick pressed={pressed} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2.5" role="group" aria-label="Industries">
          {VERTICAL_IDS.map((id) => {
            const item = curriculum.verticals[id];
            const pressed = verticalId === id;
            return (
              <div key={id} className="flex flex-col gap-2">
                <button type="button" className="choice" aria-pressed={pressed} onClick={() => setVerticalId(id)}>
                  <IconTile tint="#f6ebff" color="#8a3cc7">
                    <Glyph name={item.glyph} className="h-6 w-6" />
                  </IconTile>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="t-item">{item.short_name}</span>
                    <span className="t-small">Veto: {item.veto_holder.role}</span>
                  </span>
                  <Tick pressed={pressed} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </FocusScreen>
  );
}

function Tick({ pressed }: { pressed: boolean }) {
  return (
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${pressed ? 'bg-people-ink text-white' : 'border-2 border-rule-strong'}`} aria-hidden="true">
      {pressed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}
