'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, Check, Flag, Repeat } from 'lucide-react';
import { IconTile } from '@/components/glyph';
import { FocusScreen, Loading } from '@/components/ui';
import { BRAND, PILLAR_TINT } from '@/lib/brand';
import { loadCurriculum } from '@/lib/curriculum/load';
import { SIGNAL_IDS, TIERS, type Tier } from '@/lib/curriculum/schema';
import { arcPillar } from '@/lib/deal-room';
import { queuedSharpen } from '@/lib/sharpen';
import { pathTierSkillIds } from '@/lib/skills';
import { completePillar, drillsPassed, type SessionRecord } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';

/**
 * The end of a pillar: one screen that shows what the learner can now do and the buyer proof
 * they won, then moves them straight on. It replaces the old boss fight, which replayed the drills.
 */
export function RecapPage() {
  const params = useParams<{ tier: string }>();
  const { state, update } = useAppState();
  const curriculum = loadCurriculum();
  const tier = Number(params.tier) as Tier;
  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);
  const validTier = (TIERS as readonly number[]).includes(tier);
  const ready = Boolean(trajectory && validTier && drillsPassed(trajectory, tier) === 3);
  const complete = Boolean(trajectory?.boss[String(tier)]?.passed);

  useEffect(() => {
    if (ready && !complete && trajectory) update((current) => completePillar(current, trajectory.id, tier));
  }, [ready, complete, trajectory?.id, tier, update]);

  if (!state) return <Loading />;
  if (!trajectory || !validTier || !ready) {
    return (
      <FocusScreen top={<span />} footer={<Link href="/path" className="btn-lit">Back to my path</Link>}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <h1 className="t-title">Recap not ready yet</h1>
          <p className="t-lede">Pass the three drills in this pillar and your recap appears here.</p>
        </div>
      </FocusScreen>
    );
  }

  const rubric = curriculum.rubrics[tier];
  const pillar = arcPillar(curriculum, trajectory.clusterId, trajectory.verticalId, tier);
  const color = rubric.text_color;
  const tint = PILLAR_TINT[tier];
  const sessions = trajectory.sessions.filter((session) => session.tier === tier && session.mode === 'drill');
  const latestPassed = rubric.drills
    .map((drill) => [...sessions].reverse().find((session) => session.drillId === drill.id && session.passed))
    .filter((session): session is SessionRecord => Boolean(session));
  const quotes = latestPassed
    .map((session) => [...session.transcript].reverse().find((turn) => turn.speaker === 'buyer' && turn.reveal === 'verbatim'))
    .filter((turn): turn is NonNullable<typeof turn> => Boolean(turn));
  const proven = SIGNAL_IDS.filter((signal) => sessions.some((session) => session.bindings[signal]?.bars === 4)).length;
  const scores = rubric.drills.map((drill) => trajectory.drills[`${tier}:${drill.id}`]?.bestScore ?? 0);
  const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const skillIds = pathTierSkillIds(curriculum, trajectory, tier);
  const skills = skillIds.map((id) => curriculum.skills.find((skill) => skill.id === id)?.label).filter((label): label is string => Boolean(label));
  const queued = queuedSharpen(state, trajectory.id).filter((item) => item.beatId.startsWith(`t${tier}-`)).length;
  const last = tier === 4;
  const nextTier = (tier + 1) as Tier;
  const nextPillar = last ? null : arcPillar(curriculum, trajectory.clusterId, trajectory.verticalId, nextTier);
  const nextRubric = last ? null : curriculum.rubrics[nextTier];
  // Start means start: an authored pillar opens on its big idea, so the learner does not land on the path and tap again.
  const nextHref = last ? '/review' : nextPillar ? `/concept/${nextTier}` : '/path';

  return (
    <FocusScreen
      top={<span />}
      footer={
        <div className="flex flex-col gap-2">
          {nextRubric && (
            <p className="t-small mb-1 text-center">
              {nextPillar ? (
                <>
                  <span className="font-semibold text-ink">Next · {nextPillar.stage}.</span> {nextPillar.problem}
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink">Next · {nextRubric.transition_banner.title}</span> {nextRubric.transition_banner.body}
                </>
              )}
            </p>
          )}
          <Link href={nextHref} className="btn-lit">
            {last ? 'Take the final review' : `Start Pillar 0${tier + 1}`} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          {last && (
            <Link href="/path" className="btn-quiet w-full">
              Back to my path
            </Link>
          )}
        </div>
      }
    >
      <div className="flex animate-rise flex-col items-center gap-2 pt-6 text-center">
        <IconTile tint={tint} color={color} size="lg">
          <Flag className="h-8 w-8" strokeWidth={1.75} />
        </IconTile>
        <p className="t-label mt-2" style={{ color }}>
          Pillar {rubric.pillar} complete
        </p>
        <h1 className="t-title">{pillar?.stage ?? rubric.transition_banner.title}</h1>
        {pillar && <p className="t-body text-charcoal">{pillar.concept.title}</p>}
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-2">
        {[
          ['Drills', '3 of 3'],
          ['Signals proven', String(proven)],
          ['Avg score', `${average}%`]
        ].map(([label, value]) => (
          <div key={label} className="panel flex flex-col items-center gap-0.5 p-3">
            <dt className="t-small order-2">{label}</dt>
            <dd className="order-1 font-display text-[22px] font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6 flex flex-col gap-2" aria-label="What you can now do">
        <p className="t-label">What you can now do</p>
        <ul className="flex flex-wrap gap-2">
          {skills.map((label) => (
            <li key={label} className="flex items-center gap-1.5 rounded-full bg-profit-soft px-3 py-1.5 text-[13px] font-semibold text-profit-ink">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </section>

      {quotes.length > 0 && (
        <section className="mt-6 flex flex-col gap-2.5" aria-label="Proof you won">
          <p className="t-label">Proof you won</p>
          <ul className="flex flex-col gap-3">
            {quotes.map((turn) => (
              <li key={`${turn.id}-${turn.content}`} className="flex flex-col gap-0.5 border-l-[3px] pl-3" style={{ borderColor: BRAND.profit }}>
                <span className="t-quote text-[15px]">“{turn.content}”</span>
                <span className="t-small">{turn.speakerRole}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {queued > 0 && (
        <p className="mb-2 mt-6 flex items-center gap-2 rounded-panel bg-value-soft px-3 py-2.5 text-[14px] font-semibold text-value-ink">
          <Repeat className="h-4 w-4 shrink-0" aria-hidden="true" />
          {queued === 1 ? '1 move you missed comes back' : `${queued} moves you missed come back`} in your daily reps.
        </p>
      )}
    </FocusScreen>
  );
}
