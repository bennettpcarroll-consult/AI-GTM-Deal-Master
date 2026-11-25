'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Header } from '@/components/header';
import { RoomSession } from '@/components/room-session';
import { TIERS, type Tier } from '@/lib/curriculum/schema';
import { tierUnlocked } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';

export default function RoomPage() {
  const params = useParams<{ tier: string; mode: string }>();
  const { state, update } = useAppState();
  const [attempt, setAttempt] = useState(0);

  const tier = Number(params.tier);
  const drillMatch = /^drill-([1-3])$/.exec(params.mode);
  const isBoss = params.mode === 'boss';
  const validRoute = (TIERS as readonly number[]).includes(tier) && (isBoss || drillMatch !== null);
  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);

  let body;
  if (!state) {
    body = <p className="text-sm text-[#64748B]">Loading your deal room…</p>;
  } else if (!trajectory) {
    body = <Notice title="No active trajectory" text="Pick a cluster and vertical on the home page to start." />;
  } else if (!validRoute) {
    body = <Notice title="Unknown session" text="That drill or boss fight does not exist in this pillar." />;
  } else if (!tierUnlocked(trajectory, tier as Tier)) {
    body = <Notice title="Pillar locked" text={`Pass the Pillar 0${tier - 1} boss fight to unlock this pillar.`} />;
  } else {
    body = (
      <RoomSession
        key={`${trajectory.id}-${params.tier}-${params.mode}-${attempt}`}
        trajectory={trajectory}
        tier={tier as Tier}
        mode={isBoss ? 'boss' : 'drill'}
        drillIndex={drillMatch ? Number(drillMatch[1]) - 1 : 0}
        globalMeddpicc={state.globalCompetencies.meddpicc}
        update={update}
        onRetake={() => setAttempt((count) => count + 1)}
      />
    );
  }

  return (
    <>
      <Header workspace />
      <main className="mx-auto max-w-6xl px-4 py-8">{body}</main>
    </>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="mt-2 text-sm text-[#64748B]">{text}</p>
      <Link href="/dashboard" className="mt-5 inline-block rounded-full border border-[#E5E7EB] px-5 py-2 text-sm font-semibold hover:bg-[#F8FAFC]">
        Back to dashboard
      </Link>
    </div>
  );
}
