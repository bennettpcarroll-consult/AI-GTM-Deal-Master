'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { RoomSession } from '@/components/room-session';
import { FocusScreen, Loading } from '@/components/ui';
import type { Tier } from '@/lib/curriculum/schema';
import { roomRoute } from '@/lib/path';
import { tierUnlocked } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';

export function RoomPage() {
  const params = useParams<{ tier: string; mode: string }>();
  const router = useRouter();
  const { state, update } = useAppState();
  const [attempt, setAttempt] = useState(0);

  const tier = Number(params.tier);
  const route = roomRoute(tier, params.mode);
  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);

  // The old end-of-pillar boss fight is retired: its route forwards to the pillar recap.
  useEffect(() => {
    if (route?.kind === 'redirect') router.replace(route.href);
  }, [route?.kind, route?.kind === 'redirect' ? route.href : '', router]);

  if (route?.kind === 'redirect') return <Loading text="Opening your recap…" />;
  if (!state) return <Loading text="Opening the deal room…" />;
  if (!trajectory) return <Notice title="No active path" text="Pick what you sell and who you sell to first." href="/start" cta="Get started" />;
  if (!route) return <Notice title="Unknown session" text="That drill does not exist in this pillar." />;
  if (!tierUnlocked(trajectory, tier as Tier, state.reviewer)) {
    return <Notice title="Pillar locked" text={`Finish Pillar 0${tier - 1} to unlock this pillar.`} />;
  }

  return (
    <RoomSession
      key={`${trajectory.id}-${params.tier}-${params.mode}-${attempt}`}
      trajectory={trajectory}
      tier={tier as Tier}
      mode="drill"
      drillIndex={route.drillIndex}
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
