'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { Loading } from '@/components/ui';
import { useAppState } from '@/lib/use-app-state';

export default function HomePage() {
  const router = useRouter();
  const { state } = useAppState();
  const hasTrajectory = Boolean(state?.activeTrajectoryId);

  useEffect(() => {
    if (hasTrajectory) router.replace('/path');
  }, [hasTrajectory, router]);

  if (!state || hasTrajectory) return <Loading />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-6 pt-10">
      <p className="t-label">Deal Master · enterprise AI sales practice</p>
      <div className="flex flex-1 flex-col justify-center gap-6 py-10">
        <h1 className="t-display">
          Stop pitching.
          <br />
          <span className="bg-gradient-to-r from-[#d9480f] via-[#c2255c] to-[#7048e8] bg-clip-text text-transparent">Start closing.</span>
        </h1>
        <p className="t-lede">
          Practice real AI deals against a live buying committee. Every skill is graded on what the buyer says, never on a checkbox.
        </p>
        <ul className="flex flex-col gap-3">
          {[
            ['24 skills', 'Sales fundamentals, MEDDPICC, consumption and executive selling'],
            ['A few minutes a day', 'Two-minute reps between calls, deeper drills when you have time'],
            ['Proof, not points for showing up', 'You only score when the buyer confirms it in their own words']
          ].map(([title, body]) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-profit-soft text-profit-ink" aria-hidden="true">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="t-item">{title}</span>
                <span className="t-small">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/start" className="btn-lit">
        Get started
      </Link>
      <p className="t-small mt-3 text-center">About 8 minutes to set up, including a short diagnostic.</p>
    </main>
  );
}
