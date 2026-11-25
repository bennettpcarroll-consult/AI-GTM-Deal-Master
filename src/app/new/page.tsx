'use client';

import { useRouter } from 'next/navigation';
import { Onboarding } from '@/components/onboarding';
import { TopBar } from '@/components/top-bar';

export default function NewTrajectoryPage() {
  const router = useRouter();

  return (
    <>
      <TopBar />
      <Onboarding onDone={() => router.push('/')} />
    </>
  );
}
