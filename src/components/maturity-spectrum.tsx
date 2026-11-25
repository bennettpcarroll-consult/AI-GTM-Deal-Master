import { BRAND } from '@/lib/brand';
import { STAGES } from '@/lib/constants';
import { TIERS, type Rubric, type Tier } from '@/lib/curriculum/schema';
import { pillarStage, stageIndex, weakestTier, type Trajectory } from '@/lib/store';

export function MaturitySpectrum({ trajectory, rubrics }: { trajectory: Trajectory; rubrics: Record<Tier, Rubric> }) {
  const weakest = weakestTier(trajectory);
  const weakestStage = stageIndex(pillarStage(trajectory, weakest));

  return (
    <section className="card p-6" aria-label="Seller maturity spectrum">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Seller maturity spectrum</p>
      <h2 className="mt-1 text-xl font-extrabold tracking-tight">Qualification × Reframing × Consumption × Executive Close</h2>
      <p className="mt-1 text-sm text-[#64748B]">Your weakest pillar caps your realized win rate. It is marked in red.</p>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[720px] space-y-2">
          <div className="grid grid-cols-[190px_repeat(5,minmax(0,1fr))] gap-2">
            <div />
            {STAGES.map((stage) => (
              <div key={stage} className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                {stage}
              </div>
            ))}
          </div>

          {TIERS.map((tier) => {
            const rubric = rubrics[tier];
            const stage = pillarStage(trajectory, tier);
            const current = stageIndex(stage);
            const isBottleneck = tier === weakest && weakestStage < STAGES.length - 1;
            return (
              <div
                key={tier}
                className="grid grid-cols-[190px_repeat(5,minmax(0,1fr))] items-center gap-2 rounded-2xl p-2"
                style={{
                  background: isBottleneck ? BRAND.redTint : 'transparent',
                  border: `1px solid ${isBottleneck ? BRAND.red : 'transparent'}`
                }}
              >
                <div className="pr-2">
                  <p className="text-xs font-semibold" style={{ color: rubric.text_color }}>
                    {rubric.pillar} · {rubric.pillar_theme}
                  </p>
                  {isBottleneck && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: BRAND.red }}>
                      Bottleneck
                    </p>
                  )}
                </div>
                {STAGES.map((name, index) => {
                  const isCurrent = index === current;
                  const isBehind = index < current;
                  const cellColor = index === STAGES.length - 1 ? BRAND.emerald : rubric.color;
                  return (
                    <div
                      key={name}
                      role="img"
                      aria-label={`${rubric.pillar_theme}: ${name}${isCurrent ? ' (current)' : ''}`}
                      className="flex h-10 items-center justify-center rounded-xl text-[10px] font-bold uppercase tracking-[0.08em]"
                      style={{
                        background: isCurrent ? cellColor : isBehind ? `${rubric.color}22` : '#FFFFFF',
                        color: isCurrent ? '#FFFFFF' : '#94A3B8',
                        border: isCurrent || isBehind ? '1px solid transparent' : '1px dashed #CBD5E1'
                      }}
                    >
                      {isCurrent ? name : ''}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
