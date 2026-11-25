'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { RoomSession } from '@/components/room-session';
import { TopBar } from '@/components/top-bar';
import { loadCurriculum } from '@/lib/curriculum/load';
import { TIERS, type Tier } from '@/lib/curriculum/schema';
import { buildPath, canOpenStep } from '@/lib/path';
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
    body = <Notice title="No active trajectory" text="Pick what you sell and who you sell into to start your path." />;
  } else if (!validRoute) {
    body = <Notice title="Unknown session" text="That drill or boss fight does not exist in this unit." />;
  } else if (!canOpenStep(buildPath(trajectory, loadCurriculum().rubrics), tier as Tier, params.mode)) {
    body = <Notice title="Step locked" text="Finish the earlier steps on your path to open this one." />;
  } else {
    body = (
      <RoomSession
        key={`${trajectory.id}-${params.tier}-${params.mode}-${attempt}`}
        trajectory={trajectory}
        tier={tier as Tier}
        mode={isBoss ? 'boss' : 'drill'}
        drillIndex={drillMatch ? Number(drillMatch[1]) - 1 : 0}
        update={update}
        onRetake={() => setAttempt((count) => count + 1)}
      />
    );
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-8">{body}</main>
    </>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="mt-2 text-sm text-[#64748B]">{text}</p>
      <Link href="/" className="cta mt-5">
        Back to path
      </Link>
    </div>
  );
}
