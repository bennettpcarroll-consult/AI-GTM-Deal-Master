import { describe, expect, it } from 'vitest';
import { loadCurriculum } from '../../src/lib/curriculum/load';
import { TIERS, type ArcBeat, type Tier } from '../../src/lib/curriculum/schema';
import { chooseMove, currentBeat, roomDone, setUpRoom, type MoveKind, type RoomContext, type RoomInput, type RoomState } from '../../src/lib/deal-room';
import { gradeSession } from '../../src/lib/grader';
import { addDays, dueSharpen, queueMisses, reviewSharpen } from '../../src/lib/sharpen';
import { emptyAppState } from '../../src/lib/store';

/**
 * Quality gates for authored arcs. They hold the content to the bar a hiring manager would
 * expect: no line repeats anywhere in the arc, wrong options are plausible rather than
 * obviously wrong, each pillar brings new people into the deal, and the engine grades it fairly.
 */
const curriculum = loadCurriculum();
const arcs = Object.values(curriculum.arcs);
const base = { clusterId: 'agentic_harness', verticalId: 'banking_fsi' } as const;

function scenes(arc: (typeof arcs)[number]) {
  return arc.pillars.flatMap((pillar) => [...pillar.drills, pillar.capstone].map((scene) => ({ pillar, scene })));
}

function allBeats(arc: (typeof arcs)[number]): { tier: Tier; beat: ArcBeat }[] {
  return scenes(arc).flatMap(({ pillar, scene }) => scene.beats.map((beat) => ({ tier: pillar.tier, beat })));
}

function play(rc: RoomContext, start: RoomState, choose: (rs: RoomState) => MoveKind): RoomState {
  let rs = start;
  for (let step = 0; step < 60 && !roomDone(rs); step += 1) {
    const beat = currentBeat(rc, rs)!;
    rs = chooseMove(rc, rs, beat.moves.findIndex((move) => move.kind === choose(rs))).state;
  }
  expect(roomDone(rs)).toBe(true);
  return rs;
}

function room(input: Partial<RoomInput> & { tier: Tier; mode: 'drill' | 'boss' }) {
  return setUpRoom(curriculum, { ...base, drillIndex: 0, ...input });
}

describe('authored arc content', () => {
  it('has the reference arc for Agentic Harness x Banking', () => {
    expect(curriculum.arcs.agentic_harness__banking_fsi?.account.name).toBe('Northbridge');
  });

  it('never repeats a buyer line or an option anywhere in the arc', () => {
    for (const arc of arcs) {
      const seen = new Map<string, string>();
      for (const { beat } of allBeats(arc)) {
        for (const text of [beat.line, ...beat.options.map((option) => option.text)]) {
          expect(seen.get(text), `"${text}" in ${beat.id} repeats ${seen.get(text)}`).toBeUndefined();
          seen.set(text, beat.id);
        }
      }
    }
  });

  it('keeps distractors plausible: similar length, and a question among them whenever the elite move asks one', () => {
    for (const arc of arcs) {
      for (const { beat } of allBeats(arc)) {
        const lengths = beat.options.map((option) => option.text.length);
        expect(Math.min(...lengths), `${beat.id} option lengths ${lengths.join(', ')}`).toBeGreaterThanOrEqual(0.5 * Math.max(...lengths));
        const elite = beat.options.find((option) => option.kind === 'elite')!;
        if (elite.text.includes('?')) {
          expect(beat.options.some((option) => option.kind !== 'elite' && option.text.includes('?')), `${beat.id} has no wrong option phrased as a question`).toBe(true);
        }
      }
    }
  });

  it('gives every wrong option a named failure mode and its own buyer reply', () => {
    for (const arc of arcs) {
      for (const { beat } of allBeats(arc)) {
        const replies = beat.options.map((option) => option.reply);
        expect(new Set(replies).size, `${beat.id} replies`).toBe(replies.length);
        for (const option of beat.options.filter((candidate) => candidate.kind !== 'elite')) {
          expect(curriculum.failureModes[option.failure ?? '']?.lesson, `${beat.id} ${option.text}`).toBeTruthy();
        }
      }
    }
  });

  it('brings at least two new people into the deal in every pillar after the first', () => {
    for (const arc of arcs) {
      const met = new Set<string>();
      for (const pillar of arc.pillars) {
        const speakers = new Set([...pillar.drills, pillar.capstone].flatMap((scene) => scene.beats.map((beat) => beat.speaker)));
        const fresh = [...speakers].filter((id) => !met.has(id));
        if (pillar.tier > 1) expect(fresh.length, `tier ${pillar.tier} new speakers`).toBeGreaterThanOrEqual(2);
        speakers.forEach((id) => met.add(id));
      }
    }
  });

  it('climbs the depth ladder: four options from tier 3, and coaching labels fade after tier 2', () => {
    for (const tier of TIERS) {
      const { rc, state } = room({ tier, mode: 'drill' });
      const beat = currentBeat(rc, state)!;
      expect(beat.moves).toHaveLength(tier >= 3 ? 4 : 3);
      expect(Boolean(beat.goal), `tier ${tier} goal label`).toBe(tier <= 2);
    }
  });

  it('makes each capstone a new meeting: a voice the drills never used, and no drill line replayed', () => {
    for (const arc of arcs) {
      for (const pillar of arc.pillars) {
        const drillSpeakers = new Set(pillar.drills.flatMap((drill) => drill.beats.map((beat) => beat.speaker)));
        expect(pillar.capstone.beats.some((beat) => !drillSpeakers.has(beat.speaker)), `tier ${pillar.tier} capstone newcomer`).toBe(true);
        const drillLines = new Set(pillar.drills.flatMap((drill) => drill.beats.map((beat) => beat.line)));
        expect(pillar.capstone.beats.every((beat) => !drillLines.has(beat.line))).toBe(true);
        expect(pillar.capstone.beats.length).toBeGreaterThanOrEqual(4);
        expect(pillar.capstone.beats.length).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('authored deal room', () => {
  it('passes every drill and capstone at 100 when the learner always picks the elite move', () => {
    for (const tier of TIERS) {
      for (const input of [
        { mode: 'drill' as const, drillIndex: 0 },
        { mode: 'drill' as const, drillIndex: 1 },
        { mode: 'drill' as const, drillIndex: 2 },
        { mode: 'boss' as const, drillIndex: 0 },
        { mode: 'boss' as const, drillIndex: 0, fastTrack: true }
      ]) {
        const { rc, state } = room({ tier, ...input });
        const end = play(rc, state, () => 'elite');
        const grade = gradeSession(curriculum.rubrics[tier], end.sim);
        const where = `tier ${tier} ${input.mode} ${input.drillIndex + 1}${'fastTrack' in input ? ' fast' : ''}`;
        expect(grade.score, where).toBe(100);
        expect(grade.passed, where).toBe(true);
        expect(grade.autoFails, where).toEqual([]);
        expect(end.sim.turns.filter((turn) => turn.speaker === 'buyer').length, where).toBeGreaterThan(rc.arc!.beats.length);
      }
    }
  });

  it('never earns buyer evidence from a weak or trap move', () => {
    for (const tier of TIERS) {
      for (const drillIndex of [0, 1, 2]) {
        const { rc, state } = room({ tier, mode: 'drill', drillIndex });
        let rs = state;
        while (!roomDone(rs)) {
          const beat = currentBeat(rc, rs)!;
          beat.moves.forEach((move, index) => {
            if (move.kind === 'elite') return;
            const { outcome } = chooseMove(rc, rs, index);
            expect(outcome.evidence, `${beat.id} ${move.text}`).toBeNull();
            expect(outcome.failure?.label, `${beat.id} names the failure`).toBeTruthy();
            expect(outcome.reply).toBeTruthy();
          });
          rs = chooseMove(rc, rs, beat.moves.findIndex((move) => move.kind === 'elite')).state;
        }
      }
    }
  });

  it('opens a signal with a partial answer and needs the follow-up beat for proof', () => {
    const { rc, state } = room({ tier: 1, mode: 'drill', drillIndex: 0 });
    let rs = state;
    while (currentBeat(rc, rs)?.kind !== 'open') rs = chooseMove(rc, rs, currentBeat(rc, rs)!.moves.findIndex((move) => move.kind === 'elite')).state;
    const opened = chooseMove(rc, rs, currentBeat(rc, rs)!.moves.findIndex((move) => move.kind === 'elite'));
    expect(opened.outcome.evidence?.level).toBe('partial');
    expect(currentBeat(rc, opened.state)?.kind).toBe('pin');
    const pinned = chooseMove(rc, opened.state, currentBeat(rc, opened.state)!.moves.findIndex((move) => move.kind === 'elite'));
    expect(pinned.outcome.evidence?.level).toBe('verbatim');
  });

  it('repeats a missed drill beat with the buyer pushing back, and scores first-try accuracy', () => {
    const { rc, state } = room({ tier: 2, mode: 'drill', drillIndex: 0 });
    const first = currentBeat(rc, state)!;
    const missed = chooseMove(rc, state, first.moves.findIndex((move) => move.kind === 'weak'));
    expect(currentBeat(rc, missed.state)!.id).toBe(first.id);
    expect(missed.state.sim.turns.at(-1)?.content).toBe(missed.outcome.reply);
    const end = play(rc, missed.state, () => 'elite');
    const grade = gradeSession(curriculum.rubrics[2], end.sim);
    expect(grade.passed).toBe(true);
    expect(grade.score).toBeLessThan(100);
  });

  it('trips the matching red flag when the learner takes a flagged trap in a capstone', () => {
    for (const tier of TIERS) {
      const flagged = curriculum.arcs.agentic_harness__banking_fsi!.pillars[tier - 1]!.capstone.beats.find((beat) => beat.options.some((option) => option.flag));
      if (!flagged) continue;
      const flag = flagged.options.find((option) => option.flag)!;
      const { rc, state } = room({ tier, mode: 'boss' });
      const end = play(rc, state, (rs) => (currentBeat(rc, rs)?.id === flagged.id ? (flag.kind as MoveKind) : 'elite'));
      const grade = gradeSession(curriculum.rubrics[tier], end.sim);
      expect(grade.autoFails.map((hit) => hit.id), `tier ${tier}`).toContain(flag.flag);
      expect(grade.passed).toBe(false);
    }
  });

  it('fails a capstone on a missed core move, then clears it with a retry of only that move', () => {
    const { rc, state } = room({ tier: 3, mode: 'boss' });
    const core = rc.arc!.beats.find((beat) => beat.core)!;
    const end = play(rc, state, (rs) => (currentBeat(rc, rs)?.id === core.id ? 'weak' : 'elite'));
    expect(gradeSession(curriculum.rubrics[3], end.sim).passed).toBe(false);
    const retry = room({ tier: 3, mode: 'boss', beatIds: [core.id] });
    expect(retry.rc.arc!.beats.map((beat) => beat.id)).toEqual([core.id]);
    const cleared = play(retry.rc, retry.state, () => 'elite');
    expect(gradeSession(curriculum.rubrics[3], cleared.sim).passed).toBe(true);
  });

  it('still passes a capstone when only a non-core move is missed', () => {
    const { rc, state } = room({ tier: 1, mode: 'boss' });
    const extra = rc.arc!.beats.find((beat) => !beat.core)!;
    const end = play(rc, state, (rs) => (currentBeat(rc, rs)?.id === extra.id ? 'weak' : 'elite'));
    const grade = gradeSession(curriculum.rubrics[1], end.sim);
    expect(grade.passed).toBe(true);
    expect(grade.score).toBeLessThan(100);
  });

  it('plays only the core moves on the fast track', () => {
    const fast = room({ tier: 2, mode: 'boss', fastTrack: true });
    expect(fast.rc.arc!.beats.every((beat) => beat.core)).toBe(true);
    expect(fast.rc.arc!.beats.length).toBe(3);
  });
});

describe('spaced retrieval of missed moves', () => {
  const today = '2026-11-26';
  const queued = queueMisses(emptyAppState(), 'agentic_harness__banking_fsi', [{ beatId: 't1-d1-1', skillId: 'account_research', failure: 'early_pitch' }], today);

  it('brings a missed move back tomorrow, not today', () => {
    expect(dueSharpen(queued, 'agentic_harness__banking_fsi', today)).toEqual([]);
    expect(dueSharpen(queued, 'agentic_harness__banking_fsi', addDays(today, 1)).map((item) => item.beatId)).toEqual(['t1-d1-1']);
  });

  it('widens the gap after each clean recall and retires the move after three', () => {
    let state = queued;
    let day = addDays(today, 1);
    for (const gap of [3, 7]) {
      state = reviewSharpen(state, 'agentic_harness__banking_fsi', { 't1-d1-1': true }, day);
      expect(state.sharpen?.[0]?.due).toBe(addDays(day, gap));
      day = addDays(day, gap);
    }
    state = reviewSharpen(state, 'agentic_harness__banking_fsi', { 't1-d1-1': true }, day);
    expect(state.sharpen).toEqual([]);
  });

  it('resets the spacing when the learner misses the move again', () => {
    const tomorrow = addDays(today, 1);
    const once = reviewSharpen(queued, 'agentic_harness__banking_fsi', { 't1-d1-1': true }, tomorrow);
    const missed = reviewSharpen(once, 'agentic_harness__banking_fsi', { 't1-d1-1': false }, addDays(tomorrow, 3));
    expect(missed.sharpen?.[0]).toMatchObject({ reviews: 0, due: addDays(tomorrow, 4) });
  });
});
