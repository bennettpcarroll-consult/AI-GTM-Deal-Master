import Link from 'next/link';
import { ArrowRight, Lock, ShieldAlert } from 'lucide-react';
import { BRAND, PILLAR_TINT } from '@/lib/brand';
import type { Rubric, SignalId } from '@/lib/curriculum/schema';
import { drillKey, drillsPassed, pillarStage, tierUnlocked, type Trajectory } from '@/lib/store';
import { PillarIcon } from './pillar-icon';

function humanize(id: SignalId): string {
  const text = id.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function PillarCard({ rubric, trajectory }: { rubric: Rubric; trajectory: Trajectory }) {
  const tier = rubric.tier;
  const unlocked = tierUnlocked(trajectory, tier);
  const stage = pillarStage(trajectory, tier);
  const boss = trajectory.boss[String(tier)];
  const passedDrills = drillsPassed(trajectory, tier);
  const previousPillar = `0${tier - 1}`;

  return (
    <section id={`pillar-${tier}`} className="card scroll-mt-24 overflow-hidden" aria-labelledby={`pillar-${tier}-title`}>
      <div className="h-1" style={{ background: rubric.color }} />
      <div className="space-y-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
              style={{ background: PILLAR_TINT[tier], color: rubric.color }}
            >
              <PillarIcon name={rubric.icon} className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: rubric.text_color }}>
                {rubric.pillar} · {rubric.role_title}
              </p>
              <h2 id={`pillar-${tier}-title`} className="text-xl font-extrabold tracking-tight">
                {rubric.pillar_theme}
              </h2>
              <p className="text-sm text-[#64748B]">
                Simulated ACV {rubric.acv_band} · {passedDrills} of 3 drills passed · boss {boss?.passed ? 'passed' : 'open'}
              </p>
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
            style={
              unlocked
                ? { background: '#F1F5F9', color: '#334155' }
                : { background: '#FFFFFF', color: '#94A3B8', border: '1px dashed #CBD5E1' }
            }
          >
            {unlocked ? stage : 'Locked'}
          </span>
        </header>

        {unlocked ? (
          <div className="rounded-2xl p-4" style={{ background: PILLAR_TINT[tier] }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: rubric.text_color }}>
              {rubric.transition_banner.kicker}
            </p>
            <p className="mt-1 font-bold">{rubric.transition_banner.title}</p>
            <p className="text-sm text-[#475569]">{rubric.transition_banner.body}</p>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl border border-dashed border-[#CBD5E1] p-4 text-sm text-[#64748B]">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Pass the Pillar {previousPillar} boss fight to unlock this pillar.
          </p>
        )}

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">Micro-drills</p>
          {rubric.drills.map((drill, index) => {
            const progress = trajectory.drills[drillKey(tier, drill.id)];
            let status = `Not started · gate ${rubric.core_gate_pass_min}%`;
            if (progress?.credited) status = 'Placement credit applied';
            else if (progress?.passed) status = `Passed · best ${progress.bestScore}%`;
            else if (progress) status = `Best ${progress.bestScore}% · not yet passed (gate ${rubric.core_gate_pass_min}%)`;
            return (
              <div
                key={drill.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
                style={{ borderStyle: unlocked ? 'solid' : 'dashed', borderColor: BRAND.hairline }}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Drill {index + 1} of 3</p>
                  <p className="font-semibold">{drill.title}</p>
                  <p className="text-xs text-[#64748B]">{drill.target_signals.map(humanize).join(' · ')}</p>
                  <p className="mt-1 text-xs font-medium" style={{ color: progress?.passed ? BRAND.emeraldText : '#64748B' }}>
                    {status}
                  </p>
                </div>
                {unlocked ? (
                  <Link
                    href={`/room/${tier}/drill-${index + 1}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F8FAFC]"
                  >
                    Start drill <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="text-sm text-[#94A3B8]">Locked</span>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
          style={{ borderStyle: unlocked ? 'solid' : 'dashed', borderColor: unlocked ? rubric.color : '#CBD5E1' }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Live boss fight</p>
            <p className="font-semibold">{rubric.boss_fight.title}</p>
            <p className="text-xs text-[#64748B]">
              {boss?.passed
                ? `Passed · best ${boss.bestScore}%`
                : boss
                  ? `Best ${boss.bestScore}% · gate ${rubric.boss_pass_min}% and zero auto-fail flags`
                  : `Gate ${rubric.boss_pass_min}% with zero auto-fail flags`}
            </p>
          </div>
          {unlocked ? (
            <Link
              href={`/room/${tier}/boss`}
              className="spectrum-cta inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white"
            >
              Start boss fight <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="text-sm text-[#94A3B8]">Locked</span>
          )}
        </div>

        <footer className="space-y-3 border-t border-[#E5E7EB] pt-4 text-sm">
          <div className="flex flex-wrap gap-2">
            {rubric.frameworks.map((frameworkId) => (
              <span key={frameworkId} className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-semibold text-[#334155]">
                {frameworkId.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
          <p className="text-[#475569]">
            <span className="font-semibold text-[#111827]">Artifact:</span> {rubric.artifact}
          </p>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Auto-fail red flags</p>
            <ul className="space-y-1">
              {rubric.auto_fail_flags.map((flag) => (
                <li key={flag.id} className="flex items-start gap-2 text-[#B91C1C]">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{flag.label}.</span> <span className="text-[#475569]">{flag.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </section>
  );
}
