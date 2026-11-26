# Deal room dialogue style

The deal room should read like a real enterprise meeting, written by a careful scriptwriter. It is one conversation: the buyer speaks, the seller answers, and the buyer answers that answer. These rules apply to every path: generated rooms (skills, verticals, scenarios, `room.json`) and authored arcs (`curriculum/arcs/`). `tests/rubric/dialogue.test.ts` and `tests/rubric/arc-quality.test.ts` enforce them in CI.

## Voice

- Senior enterprise buyers talk in plain, grounded corporate language. They are busy, a little guarded, and specific about their own business.
- Praise is earned and rare. A good move gets acknowledgement that shows the buyer heard it ("Agreed. A fixed end date makes it easier to get the team's time."), not applause. Never use "Great question", "Nobody has asked us that", "Love that", "Absolutely" or exclamation marks.
- A weak move gets mild, professional pushback. A trap gets a cooler reply that names the problem. Neither one lectures.
- Keep lines short: one or two sentences, no em dashes, sentence case.

## Continuity

1. **Every reply answers the line just said.** Each skill carries `rep.replies` for the strong, weak and trap moves, plus `settle` and `assume` for follow-up beats. Each reply responds to the words of that exact move. A reply that would fit any move is not allowed.
2. **The person addressed answers.** A written reply comes from the buyer who spoke last. Evidence comes from the vertical's named speaker for that signal, and that speaker also raises the topic first.
3. **The buyer raises a topic before the seller asks about it.** Every signal beat opens on the vertical's `buyer_reveals.<signal>.setup` line, and that line names every account fact the seller's opening question then uses (for example "zero retention, encryption keys, audit logs" before "How will you score vendors on zero retention, keys and audit logs?"). A partial answer introduces whatever the follow-up question names. The only exception is a point-of-view skill (account research, commercial insight, value messaging, answer first, business case), where the seller brings researched facts on purpose.
4. **Answers follow the question asked.** A partial answer responds to the opening question. A verified answer leads with the direct answer to the follow-up, then adds the detail.
5. **Lines that only fit the start of a meeting appear only at the start.** Openers run in meeting order (up-front contract, research, point of view). Seller-led skills (`rep.seller_led`) get no buyer setup once the meeting is under way.

## Say each thing once

- No buyer line is said twice in a session, and no two buyer lines repeat a run of six words. A buyer line never restates what another buyer line just said.
- No reply text is reused across skills, objections or vertical lines.
- A move the learner already tried on a beat is removed on the retry, so the learner never says the same line twice either.
- A drill raises at most one objection.
- The screen shows each line once, in one bubble style. Speaker names appear once per run of consecutive lines. Evidence and objections carry a small tag, not a different layout.

## Adding content

- New skill: write `rep.buyer_line` so it works at any point in a meeting, then write `rep.replies` to answer each move word for word.
- New vertical: write `setup`, `partial` and `verbatim` for every signal in `buyer_reveals`, and check the open and pin questions in `talk_tracks` against rule 3.
- Run `pnpm test:rubric`. If the dialogue gate fails, rewrite the content. Never loosen the gate to fit the content.
