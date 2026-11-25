'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { RoomSession } from '@/components/room-session';
import { FocusScreen, Loading } from '@/components/ui';
import { TIERS, type Tier } from '@/lib/curriculum/schema';
import { tierUnlocked } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';

export function RoomPage() {
  const params = useParams<{ tier: string; mode: string }>();
  const { state, update } = useAppState();
  const [attempt, setAttempt] = useState(0);

  const tier = Number(params.tier);
  const drillMatch = /^drill-([1-3])$/.exec(params.mode);
  const isBoss = params.mode === 'boss';
  const validRoute = (TIERS as readonly number[]).includes(tier) && (isBoss || drillMatch !== null);
  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);

  if (!state) return <Loading text="Opening the deal room…" />;
  if (!trajectory) return <Notice title="No active path" text="Pick what you sell and who you sell to first." href="/start" cta="Get started" />;
  if (!validRoute) return <Notice title="Unknown session" text="That drill or boss fight does not exist in this pillar." />;
  if (!tierUnlocked(trajectory, tier as Tier)) {
    return <Notice title="Pillar locked" text={`Pass the Pillar 0${tier - 1} boss fight to unlock this pillar.`} />;
  }

  return (
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

function Notice({ title, text, href = '/path', cta = 'Back to my path' }: { title: string; text: string; href?: string; cta?: string }) {
  return (
    <FocusScreen top={<span />} footer={<Link href={href} className="btn-lit">{cta}</Link>}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-deep text-slate" aria-hidden="true">
          <Lock className="h-7 w-7" />
        </span>
        <h1 className="t-title">{title}</h1>
        <p className="t-lede">{text}</p>
      </div>
    </FocusScreen>
  );
}
