'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { Loading } from '@/components/ui';
import { loadCurriculum } from '@/lib/curriculum/load';
import { useAppState } from '@/lib/use-app-state';

/** The three shifts that define enterprise AI selling now. One line each. */
const SHIFTS = [
  ['Pilots', 'P&L', 'Budgets follow proven outcomes, not experiments.'],
  ['Seats', 'Consumption', 'Revenue grows with the workload, after the signature.'],
  ['One champion', 'Veto committee', 'Model risk, legal and finance can each say no.']
] as const;

/**
 * The front door. Every visitor lands here, returning learners included, so nobody is dropped
 * mid-path without context. One idea, one live buyer move, one action.
 */
export default function FrontDoor() {
  const { state } = useAppState();
  const teasers = loadCurriculum().room.teaser;
  const [tab, setTab] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const teaser = teasers[tab]!;
  const choice = picked === null ? null : teaser.options[picked]!;

  // 1, 2, 3 pick a reply, as in the buyer room.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || picked !== null) return;
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= teaser.options.length) setPicked(number - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, teaser.options.length]);

  if (!state) return <Loading />;
  const returning = state.trajectories.length > 0;
  const good = choice?.kind === 'elite';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-8 pt-8">
      <span className="font-display text-[17px] font-extrabold">Deal Master</span>

      <h1 className="t-display mt-10">
        Close the deal.
        <br />
        <span className="bg-gradient-to-r from-[#d9480f] via-[#c2255c] to-[#7048e8] bg-clip-text text-transparent">Then close the workload.</span>
      </h1>
      <p className="t-lede mt-4">Enterprise AI selling, practiced against a full buying committee. Graded only on what the buyer says.</p>

      <ol className="mt-8 flex flex-col divide-y divide-hairline border-y border-hairline" aria-label="What changed">
        {SHIFTS.map(([from, to, line]) => (
          <li key={to} className="flex flex-col gap-0.5 py-3">
            <span className="t-item">
              <span className="text-slate line-through decoration-rule-strong">{from}</span>
              <ArrowRight className="mx-1.5 inline h-4 w-4 align-[-2px] text-slate" aria-hidden="true" />
              {to}
            </span>
            <span className="t-small">{line}</span>
          </li>
        ))}
      </ol>

      <section className="mt-10" aria-labelledby="try-heading">
        <div className="flex items-end justify-between gap-3">
          <h2 id="try-heading" className="t-heading">
            Try one move
          </h2>
          <span className="t-small">20 seconds</span>
        </div>
        <div className="mt-3 flex gap-1 rounded-full bg-deep p-1" role="tablist" aria-label="Buyer">
          {teasers.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === index}
              onClick={() => {
                setTab(index);
                setPicked(null);
              }}
              className={`min-h-[40px] flex-1 rounded-full px-3 text-[13px] font-bold transition ${tab === index ? 'bg-paper text-ink shadow-lift' : 'text-slate hover:text-ink'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div key={teaser.id} className="mt-4 flex animate-rise flex-col gap-3" role="tabpanel">
          <p className="t-small font-semibold text-charcoal">{teaser.speaker}</p>
          <blockquote className="t-quote rounded-[4px_24px_24px_24px] bg-deep px-5 py-4">{teaser.line}</blockquote>
          <div className="mt-1 flex flex-col gap-2.5" role="group" aria-label="Replies">
            {teaser.options.map((option, index) => (
              <button
                key={option.text}
                type="button"
                className="choice"
                aria-pressed={picked === index}
                data-state={picked === null ? undefined : option.kind === 'elite' ? 'right' : picked === index ? 'wrong' : undefined}
                disabled={picked !== null}
                onClick={() => setPicked(index)}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-rule-strong text-[13px] font-bold text-slate" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="t-body">{option.text}</span>
              </button>
            ))}
          </div>
          {choice && (
            <div className={`flex animate-rise items-start gap-3 rounded-panel p-4 ${good ? 'bg-profit-soft' : 'bg-leak-soft'}`} role="status">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ${good ? 'bg-profit-ink' : 'bg-leak-ink'}`} aria-hidden="true">
                {good ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
              </span>
              <p className="t-body">
                <span className={`font-bold ${good ? 'text-profit-ink' : 'text-leak-ink'}`}>{choice.verdict}.</span> {choice.why}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-10 flex flex-col gap-2">
        <Link href={returning ? '/path' : '/start'} className="btn-lit">
          {returning ? 'Continue my path' : 'Pick your path'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        {returning && (
          <Link href="/start" className="btn-quiet w-full">
            Start another path
          </Link>
        )}
        <p className="t-small mt-1 text-center">Four pillars, from qualifying to the multi-year close. No typing.</p>
      </div>
    </main>
  );
}
