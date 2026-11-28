'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Loading } from '@/components/ui';
import { useAppState } from '@/lib/use-app-state';

/** How enterprise AI is bought now, against how it used to be. */
const SHIFT = [
  ['Pilots', 'P&L'],
  ['Seats', 'Consumption'],
  ['One champion', 'Veto committee']
] as const;

/**
 * The front door. Every visitor lands here, returning learners included. One promise, the market
 * shift from A to B, one action. Nothing else.
 */
export default function FrontDoor() {
  const { state } = useAppState();
  if (!state) return <Loading />;
  const returning = state.trajectories.length > 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-8 pt-8">
      <span className="font-display text-[17px] font-extrabold">Deal Master</span>

      <div className="flex flex-1 flex-col justify-center gap-10 py-12">
        <div className="flex flex-col gap-4">
          <p className="t-label">The AI market moved</p>
          <h1 className="t-display">
            Sell AI the way
            <br />
            <span className="bg-gradient-to-r from-[#d9480f] via-[#c2255c] to-[#7048e8] bg-clip-text text-transparent">it is bought now.</span>
          </h1>
        </div>

        <div className="grid grid-cols-[auto_auto_1fr] items-center gap-x-4 gap-y-4 rounded-card bg-deep p-5 sm:gap-x-6 sm:p-6" aria-label="Then and now">
          <p className="t-label">Then</p>
          <span aria-hidden="true" />
          <p className="t-label text-people-ink">Now</p>
          {SHIFT.map(([from, to]) => (
            <div key={to} className="contents">
              <p className="whitespace-nowrap text-[16px] font-semibold text-slate sm:text-[17px]">{from}</p>
              <ArrowRight className="h-4 w-4 text-slate" aria-hidden="true" />
              <p className="whitespace-nowrap font-display text-[18px] font-bold leading-tight sm:text-[20px]">{to}</p>
            </div>
          ))}
        </div>

        <Link href={returning ? '/path' : '/start'} className="btn-lit">
          {returning ? 'Continue my path' : 'Start practicing'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
