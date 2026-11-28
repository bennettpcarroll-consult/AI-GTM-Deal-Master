'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { FocusScreen, StepBar } from './ui';

export interface FlowQuestion {
  id: string;
  /** Small caps line above the question, such as the skill being tested. */
  kicker: string;
  prompt: string;
  /** When set, the prompt is shown as a buyer quote from this speaker. */
  speaker?: string;
  ask?: string;
  options: string[];
  answer: number;
  /** One line on why the answer is right. Leave empty when the screen already said it. */
  why: string;
  /** Shown instead of `why` after a wrong pick, when the learner needs the full idea again. */
  missWhy?: string;
  /** A move is a line the seller would say ("Strong move."). A fact is knowledge ("Correct."). Defaults to move when a buyer speaks. */
  kind?: 'move' | 'fact';
  /** Buyer trust each option costs, for reps. A miss shows the cost beside the verdict. */
  trustCost?: number[];
}

/**
 * One question per screen: pick, check, see why, continue.
 * Used for lesson checks, the starting diagnostic and daily reps.
 */
export function QuestionFlow({
  questions,
  onDone,
  exitHref,
  onBack,
  progressLabel,
  stepLabel,
  progress
}: {
  questions: FlowQuestion[];
  onDone: (results: Record<string, boolean>, meta: { trustLost: number }) => void;
  exitHref?: string;
  onBack?: () => void;
  progressLabel: string;
  /** Shown above each question, such as "Step 4 of 6 · Lesson check". The question count is appended. */
  stepLabel?: string;
  /** Maps the position in this flow onto a longer journey, so one progress bar spans all of onboarding. */
  progress?: (done: number) => { value: number; max: number };
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [trustLost, setTrustLost] = useState(0);
  const question = questions[index];
  const correct = question !== undefined && picked === question.answer;
  const isMove = (question?.kind ?? (question?.speaker ? 'move' : 'fact')) === 'move';
  const explanation = question && !correct && question.missWhy ? question.missWhy : question?.why;

  const check = () => {
    if (picked === null || !question) return;
    setChecked(true);
    setResults((previous) => ({ ...previous, [question.id]: picked === question.answer }));
    setTrustLost((previous) => previous + (question.trustCost?.[picked] ?? 0));
  };

  const next = () => {
    if (!question) return;
    const finalResults = { ...results, [question.id]: correct };
    if (index + 1 >= questions.length) {
      onDone(finalResults, { trustLost });
      return;
    }
    setIndex(index + 1);
    setPicked(null);
    setChecked(false);
  };

  const back = () => {
    setIndex(index - 1);
    setPicked(null);
    setChecked(false);
  };

  // The numbered keycaps work: 1, 2, 3 pick a reply and Enter checks or continues.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!question) return;
      const number = Number(event.key);
      if (!checked && Number.isInteger(number) && number >= 1 && number <= question.options.length) {
        event.preventDefault();
        setPicked(number - 1);
      } else if (event.key === 'Enter' && !(target instanceof HTMLButtonElement)) {
        event.preventDefault();
        if (checked) next();
        else check();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!question) return null;
  const done = index + (checked ? 1 : 0);
  const bar = progress ? progress(done) : { value: done, max: questions.length };

  return (
    <FocusScreen
      top={
        <StepBar
          exitHref={exitHref}
          onBack={index === 0 ? onBack : back}
          value={bar.value}
          max={bar.max}
          label={progressLabel}
        />
      }
      footer={
        checked ? (
          <div
            className={`-mx-5 animate-rise rounded-t-card px-5 pb-2 pt-5 ${correct ? 'bg-profit-soft' : 'bg-leak-soft'}`}
            role="status"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-full text-white ${correct ? 'bg-profit-ink' : 'bg-leak-ink'}`}>
                {correct ? <Check className="h-5 w-5" aria-hidden="true" /> : <X className="h-5 w-5" aria-hidden="true" />}
              </span>
              <p className={`t-heading ${correct ? 'text-profit-ink' : 'text-leak-ink'}`}>{correct ? (isMove ? 'Strong move.' : 'Correct.') : 'Not quite.'}</p>
              {!correct && picked !== null && (question.trustCost?.[picked] ?? 0) > 0 && (
                <span className="ml-auto rounded-full bg-paper px-2.5 py-1 text-[13px] font-bold tabular-nums text-leak-ink">Trust −{question.trustCost![picked]}</span>
              )}
            </div>
            {!correct && (
              <p className="t-body mb-2">
                <span className="font-bold">{isMove ? 'Strongest reply:' : 'Answer:'}</span> {question.options[question.answer]}
              </p>
            )}
            {explanation ? <p className="t-body mb-4 text-charcoal">{explanation}</p> : <div className="mb-2" />}
            <button type="button" onClick={next} className={correct ? 'btn-profit' : 'btn-leak'} autoFocus>
              Continue
            </button>
          </div>
        ) : (
          <button type="button" onClick={check} disabled={picked === null} className="btn-lit">
            Check
          </button>
        )
      }
    >
      <div key={question.id} className="flex animate-rise flex-col gap-5 pt-7">
        <div className="flex flex-col gap-1">
          {stepLabel && (
            <p className="t-label">
              {stepLabel} · {index + 1} of {questions.length}
            </p>
          )}
          <p className={stepLabel ? 'text-[14px] font-semibold text-people-ink' : 't-label'}>{question.kicker}</p>
        </div>
        {question.speaker ? (
          <div className="flex flex-col gap-3">
            <p className="t-small font-semibold text-charcoal">{question.speaker} says</p>
            <blockquote className="t-quote rounded-[4px_24px_24px_24px] bg-deep px-5 py-4">{question.prompt}</blockquote>
            <p className="t-item">{question.ask ?? 'What is your strongest reply?'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <h1 className="t-title">{question.prompt}</h1>
            {question.ask && <p className="t-item">{question.ask}</p>}
          </div>
        )}
        <div className="flex flex-col gap-2.5" role="group" aria-label="Replies">
          {question.options.map((option, optionIndex) => {
            let stateAttr: string | undefined;
            if (checked && optionIndex === question.answer) stateAttr = 'right';
            else if (checked && optionIndex === picked) stateAttr = 'wrong';
            return (
              <button
                key={option}
                type="button"
                className="choice"
                aria-pressed={picked === optionIndex}
                data-state={stateAttr}
                disabled={checked}
                onClick={() => setPicked(optionIndex)}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-rule-strong text-[13px] font-bold text-slate" aria-hidden="true">
                  {optionIndex + 1}
                </span>
                <span className="t-body">{option}</span>
              </button>
            );
          })}
        </div>
      </div>
    </FocusScreen>
  );
}
