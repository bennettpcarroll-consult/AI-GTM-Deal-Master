import { describe, expect, it } from 'vitest';
import { loadCurriculum } from '../../src/lib/curriculum/load';
import { CLUSTER_IDS, TIERS, VERTICAL_IDS, type ClusterId, type Tier, type VerticalId } from '../../src/lib/curriculum/schema';
import { chooseMove, currentBeat, roomDone, roomProgress, setUpRoom, type MoveKind, type RoomContext, type RoomState } from '../../src/lib/deal-room';
import { gradeSession } from '../../src/lib/grader';

const curriculum = loadCurriculum();
const MODES = [
  { mode: 'drill' as const, drillIndex: 0 },
  { mode: 'drill' as const, drillIndex: 1 },
  { mode: 'drill' as const, drillIndex: 2 },
  { mode: 'boss' as const, drillIndex: 0 }
];

function pickIndex(rc: RoomContext, rs: RoomState, kind: MoveKind): number {
  const beat = currentBeat(rc, rs);
  if (!beat) throw new Error('No beat');
  return beat.moves.findIndex((move) => move.kind === kind);
}

/** Plays a session, choosing per beat. Fails if it runs away, so content gaps cannot loop forever. */
function play(rc: RoomContext, start: RoomState, choose: (rs: RoomState) => MoveKind): RoomState {
  let rs = start;
  for (let step = 0; step < 80 && !roomDone(rs); step += 1) {
    rs = chooseMove(rc, rs, pickIndex(rc, rs, choose(rs))).state;
  }
  expect(roomDone(rs), 'session should finish').toBe(true);
  return rs;
}

function setUp(clusterId: ClusterId, verticalId: VerticalId, tier: Tier, mode: 'drill' | 'boss', drillIndex: number) {
  return setUpRoom(curriculum, { clusterId, verticalId, tier, mode, drillIndex });
}

describe('zero-typing deal room', () => {
  it('passes every drill and boss fight in all 20 trajectories when the learner always picks the elite move', () => {
    for (const clusterId of CLUSTER_IDS) {
      for (const verticalId of VERTICAL_IDS) {
        for (const tier of TIERS) {
          for (const { mode, drillIndex } of MODES) {
            const { rc, state } = setUp(clusterId, verticalId, tier, mode, drillIndex);
            const end = play(rc, state, () => 'elite');
            const grade = gradeSession(curriculum.rubrics[tier], end.sim);
            const where = `${clusterId} x ${verticalId}, tier ${tier} ${mode} ${drillIndex + 1}`;
            expect(end.walkedOut, where).toBe(false);
            expect(grade.autoFails.map((flag) => flag.id), where).toEqual([]);
            expect(grade.score, where).toBe(100);
            expect(grade.passed, where).toBe(true);
            expect(roomProgress(end).value, where).toBe(roomProgress(end).max);
          }
        }
      }
    }
  });

  it('never lets a weak or trap line move the beat forward with buyer evidence', () => {
    for (const verticalId of VERTICAL_IDS) {
      for (const tier of TIERS) {
        for (const { mode, drillIndex } of MODES) {
          const { rc, state } = setUp('foundation_models', verticalId, tier, mode, drillIndex);
          let rs = state;
          while (!roomDone(rs)) {
            const beat = currentBeat(rc, rs)!;
            for (const kind of ['weak', 'trap'] as const) {
              const { outcome } = chooseMove(rc, rs, pickIndex(rc, rs, kind));
              expect(outcome.evidence, `${verticalId} tier ${tier} ${beat.id} ${kind}`).toBeNull();
            }
            rs = chooseMove(rc, rs, pickIndex(rc, rs, 'elite')).state;
          }
        }
      }
    }
  });

  it('opens a signal with a partial answer and needs the follow-up for proof', () => {
    const { rc, state } = setUp('data_context', 'law_firms', 1, 'drill', 0);
    let rs = state;
    while (currentBeat(rc, rs)?.kind === 'rep') rs = chooseMove(rc, rs, pickIndex(rc, rs, 'elite')).state;
    expect(currentBeat(rc, rs)?.kind).toBe('open');
    const opened = chooseMove(rc, rs, pickIndex(rc, rs, 'elite'));
    expect(opened.outcome.evidence?.level).toBe('partial');
    expect(currentBeat(rc, opened.state)?.kind).toBe('pin');
    const pinned = chooseMove(rc, opened.state, pickIndex(rc, opened.state, 'elite'));
    expect(pinned.outcome.evidence?.level).toBe('verbatim');
    expect(pinned.outcome.verdict).toContain('verified');
  });

  it('repeats a missed beat in a drill, reshuffled, and shows the elite line', () => {
    const { rc, state } = setUp('compute_infra', 'insurance', 1, 'drill', 0);
    const before = currentBeat(rc, state)!;
    const { state: after, outcome } = chooseMove(rc, state, pickIndex(rc, state, 'weak'));
    expect(currentBeat(rc, after)!.id).toBe(before.id);
    expect(after.attempts).toBe(1);
    expect(outcome.elite).toBe(before.moves.find((move) => move.kind === 'elite')!.text);
    expect(outcome.kind).toBe('weak');
  });

  it('raises an objection after a trap, and clears it only when the learner handles it', () => {
    const { rc, state } = setUp('agentic_harness', 'banking_fsi', 1, 'drill', 0);
    const trapped = chooseMove(rc, state, pickIndex(rc, state, 'trap')).state;
    expect(trapped.objection).not.toBeNull();
    expect(currentBeat(rc, trapped)?.kind).toBe('objection');
    expect(trapped.sim.turns.at(-1)?.objection).toBe(true);
    const dismissed = chooseMove(rc, trapped, pickIndex(rc, trapped, 'weak')).state;
    expect(currentBeat(rc, dismissed)?.kind).toBe('objection');
    const handled = chooseMove(rc, dismissed, pickIndex(rc, dismissed, 'elite')).state;
    expect(handled.objection).toBeNull();
  });

  it('trips the matching red flag when the learner picks a trap in a boss fight', () => {
    const cases: { tier: Tier; flag: string; trapWhen: (rc: RoomContext, rs: RoomState) => boolean }[] = [
      { tier: 1, flag: 'coach_as_champion', trapWhen: (rc, rs) => currentBeat(rc, rs)?.signal === 'champion' },
      { tier: 2, flag: 'discount_before_pbo', trapWhen: (rc, rs) => currentBeat(rc, rs)?.kind === 'objection' },
      { tier: 3, flag: 'commit_without_forecast', trapWhen: (rc, rs) => currentBeat(rc, rs)?.skillId === 'ramp_commit' && currentBeat(rc, rs)?.kind === 'pin' }
    ];
    for (const { tier, flag, trapWhen } of cases) {
      const { rc, state } = setUp('vertical_agents', 'consumer_brands', tier, 'boss', 0);
      let trapped = false;
      const end = play(rc, state, (rs) => {
        if (!trapped && trapWhen(rc, rs)) {
          trapped = true;
          return 'trap';
        }
        return 'elite';
      });
      expect(trapped, `tier ${tier} reached the trap beat`).toBe(true);
      const grade = gradeSession(curriculum.rubrics[tier], end.sim);
      expect(grade.autoFails.map((hit) => hit.id), `tier ${tier}`).toContain(flag);
      expect(grade.passed).toBe(false);
    }
  });

  it('ends a boss fight when the buyer loses all trust', () => {
    const { rc, state } = setUp('foundation_models', 'insurance', 2, 'boss', 0);
    const end = play(rc, state, () => 'trap');
    expect(end.walkedOut).toBe(true);
    expect(end.sim.turns.at(-1)?.content).toBe(curriculum.room.walkout);
    expect(gradeSession(curriculum.rubrics[2], end.sim).passed).toBe(false);
  });

  it('uses the industry talk track, so a law firm never hears the bank line', () => {
    const law = setUp('vertical_agents', 'law_firms', 1, 'drill', 0);
    let rs = law.state;
    while (currentBeat(law.rc, rs)?.kind === 'rep') rs = chooseMove(law.rc, rs, pickIndex(law.rc, rs, 'elite')).state;
    const texts = currentBeat(law.rc, rs)!.moves.map((move) => move.text).join(' ');
    expect(texts).toContain('fixed-fee');
    expect(texts).not.toContain('fraud');
  });
});
