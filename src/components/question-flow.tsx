'use client';

import { useState } from 'react';
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
  why: string;
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
  progressLabel
}: {
  questions: FlowQuestion[];
  onDone: (results: Record<string, boolean>) => void;
  exitHref?: string;
  onBack?: () => void;
  progressLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const question = questions[index];
  if (!question) return null;
  const correct = picked === question.answer;

  const check = () => {
    if (picked === null) return;
    setChecked(true);
    setResults((previous) => ({ ...previous, [question.id]: picked === question.answer }));
  };

  const next = () => {
    const finalResults = { ...results, [question.id]: correct };
    if (index + 1 >= questions.length) {
      onDone(finalResults);
      return;
    }
    setIndex(index + 1);
    setPicked(null);
    setChecked(false);
  };

  return (
    <FocusScreen
      top={
        <StepBar
          exitHref={exitHref}
          onBack={index === 0 ? onBack : undefined}
          value={index + (checked ? 1 : 0)}
          max={questions.length}
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
              <p className={`t-heading ${correct ? 'text-profit-ink' : 'text-leak-ink'}`}>{correct ? 'Strong move.' : 'Not quite.'}</p>
            </div>
            {!correct && (
              <p className="t-body mb-2">
                <span className="font-bold">Strongest reply:</span> {question.options[question.answer]}
              </p>
            )}
            <p className="t-body mb-4 text-charcoal">{question.why}</p>
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
        <p className="t-label">{question.kicker}</p>
        {question.speaker ? (
          <div className="flex flex-col gap-3">
            <p className="t-small font-semibold text-charcoal">{question.speaker} says</p>
            <blockquote className="t-quote rounded-[4px_24px_24px_24px] bg-deep px-5 py-4">{question.prompt}</blockquote>
            <p className="t-item">{question.ask ?? 'What is your strongest reply?'}</p>
          </div>
        ) : (
          <h1 className="t-title">{question.prompt}</h1>
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
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-rule-strong text-[13px] font-bold text-slate">
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
