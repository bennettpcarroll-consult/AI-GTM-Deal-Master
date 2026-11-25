'use client';

import { Onboarding } from '@/components/onboarding';
import { PathHome } from '@/components/path-home';
import { TopBar } from '@/components/top-bar';
import { useAppState } from '@/lib/use-app-state';

export default function HomePage() {
  const { state } = useAppState();
  const trajectory = state?.trajectories.find((candidate) => candidate.id === state.activeTrajectoryId);

  return (
    <>
      <TopBar />
      {!state ? (
        <p className="mx-auto max-w-xl px-4 py-8 text-sm text-[#64748B]">Loading your path…</p>
      ) : trajectory ? (
        <PathHome trajectory={trajectory} />
      ) : (
        <Onboarding />
      )}
    </>
  );
}
