'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Glyph, IconTile } from '@/components/glyph';
import { Loading, MasteryBadge } from '@/components/ui';
import { FAMILY_COLOR, FAMILY_TINT } from '@/lib/brand';
import { loadCurriculum } from '@/lib/curriculum/load';
import { masteryMap, whereTaught } from '@/lib/skills';
import { tierUnlocked } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';

export default function SkillsPage() {
  const { state } = useAppState();
  const curriculum = loadCurriculum();
  if (!state) return <Loading />;
  const trajectory = state.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);
  const mastery = masteryMap(curriculum, state, trajectory);
  const counts = [4, 3, 2].map((level) => Object.values(mastery).filter((value) => value === level).length);

  return (
    <AppShell state={state} trajectory={trajectory}>
      <div className="flex flex-col gap-2">
        <p className="t-label">Skill map</p>
        <h1 className="t-title">24 skills. One career.</h1>
        <p className="t-lede">Every drill builds named skills. Tap a skill to see its talk track and where you practice it.</p>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-2">
        {(['Certified', 'Proven', 'Practiced'] as const).map((label, index) => (
          <div key={label} className="panel flex flex-col items-center gap-0.5 p-3">
            <dt className="t-small order-2">{label}</dt>
            <dd className="order-1 font-display text-[26px] font-extrabold tabular-nums">{counts[index]}</dd>
          </div>
        ))}
      </dl>

      {curriculum.families.map((family) => {
        const color = FAMILY_COLOR[family.id] ?? '#5e6672';
        return (
          <section key={family.id} className="mt-8" aria-labelledby={`family-${family.id}`}>
            <div className="flex items-center gap-3">
              <IconTile tint={FAMILY_TINT[family.id] ?? '#f4f5f7'} color={color}>
                <Glyph name={family.glyph} className="h-6 w-6" />
              </IconTile>
              <h2 id={`family-${family.id}`} className="t-heading">
                {family.display_name}
              </h2>
            </div>
            <p className="t-small mt-1">{family.summary}</p>
            <ul className="mt-4 flex flex-col gap-2">
              {family.skills.map((skill) => {
                const level = mastery[skill.id] ?? 1;
                const places = whereTaught(curriculum, skill.id);
                return (
                  <li key={skill.id}>
                    <details className="group rounded-panel border border-hairline bg-paper open:shadow-lift">
                      <summary className="flex min-h-[60px] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <span className="t-item flex-1">{skill.label}</span>
                        <MasteryBadge level={level} />
                        <ChevronDown className="h-4 w-4 text-slate transition group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <div className="flex flex-col gap-4 border-t border-rule px-4 pb-4 pt-3">
                        <p className="t-body">{skill.definition}</p>
                        <div className="grid gap-2">
                          <div className="rounded-xl bg-profit-soft p-3">
                            <p className="t-label text-profit-ink">Strong move</p>
                            <p className="t-body mt-1">“{skill.talk_track.strong}”</p>
                          </div>
                          <div className="rounded-xl bg-deep p-3">
                            <p className="t-label">Instead of</p>
                            <p className="t-body mt-1 text-charcoal">“{skill.talk_track.weak}”</p>
                          </div>
                        </div>
                        <p className="t-small">
                          <span className="font-semibold text-ink">Proof that counts:</span> {skill.talk_track.proof}.
                        </p>
                        {trajectory && places.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {places.map(({ tier, drillIndex }) => {
                              const rubric = curriculum.rubrics[tier];
                              const unlocked = tierUnlocked(trajectory, tier);
                              const label = `Pillar ${rubric.pillar} · ${rubric.drills[drillIndex]?.title}`;
                              return unlocked ? (
                                <Link key={label} href={`/room/${tier}/drill-${drillIndex + 1}`} className="btn-quiet min-h-[40px] px-3 text-[13px]">
                                  {label}
                                </Link>
                              ) : (
                                <span key={label} className="inline-flex min-h-[40px] items-center rounded-full border border-dashed border-rule-strong px-3 text-[13px] font-semibold text-slate">
                                  {label} · locked
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </AppShell>
  );
}
