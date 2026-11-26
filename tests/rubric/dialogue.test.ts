import { describe, expect, it } from 'vitest';
import { loadCurriculum, scenarioFor } from '../../src/lib/curriculum/load';
import { CLUSTER_IDS, TIERS, VERTICAL_IDS, type ClusterId, type Tier, type VerticalId } from '../../src/lib/curriculum/schema';
import { chooseMove, currentBeat, roomDone, setUpRoom, type MoveKind, type RoomContext, type RoomState } from '../../src/lib/deal-room';
import type { Turn } from '../../src/lib/simulator';

/**
 * The dialogue gate (docs/dialogue-style.md). Every deal room on every path must read as one
 * conversation: no line said twice, every move answered, replies from the person addressed,
 * and no seller line that names a fact the buyer has not raised yet.
 */
const curriculum = loadCurriculum();

/** Stock lines that read as canned or gushing. Add to this list, never remove from it. */
const BANNED = [
  /nobody has asked/i,
  /great question/i,
  /love (that|this|it)/i,
  /right place to start/i,
  /that is useful framing/i,
  /\babsolutely\b/i,
  /\bamazing\b/i,
  /\bawesome\b/i,
  /!/
];

function buyerLines(verticalId: VerticalId): string[] {
  const vertical = curriculum.verticals[verticalId];
  const room = curriculum.room;
  const skills = curriculum.skills.flatMap((skill) => {
    const override = vertical.rep_overrides?.[skill.id];
    return [override?.buyer_line ?? skill.rep.buyer_line, ...Object.values(skill.rep.replies)];
  });
  const reveals = Object.values(vertical.buyer_reveals).flatMap((reveal) => [reveal.setup, reveal.partial, reveal.verbatim]);
  const scenarios = CLUSTER_IDS.flatMap((clusterId) => {
    const { reveals: lines } = scenarioFor(curriculum, clusterId, verticalId).consumption_profile;
    return [lines.forecast.partial, lines.forecast.verbatim, lines.ramp.partial, lines.ramp.verbatim];
  });
  return [...skills, ...Object.values(room.objection_replies), room.walkout, ...vertical.signature_objections, ...reveals, ...[...new Set(scenarios)]];
}

/** Plain words that are not facts about the account, so a seller may use them first. */
const COMMON = new Set(['without', 'raising', 'keeps', 'keep', 'while', 'beyond', 'hold', 'staffed', 'handled', 'question', 'start', 'finish', 'improve']);
const STOP = new Set(
  'the a an and or but if so to of in on at for with by from as is are was were be been it its this that these those you your we our us i my me they them their what who whom which when where why how do does did can could would should will may might must not no than then there here about into over under after before up down out off all any each every some more most less much many few just only also very too again once now today next year years month months week weeks day days time quarter way thing things one two three four five six ten let get got have has had make made take go going see show tell walk give put need want know think help work worth like well back'.split(' ')
);
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9' -]/g, ' ')
    .split(/[\s-]+/)
    .map((word) => word.replace(/'s$/, '').replace(/^'|'$/g, ''))
    .filter((word) => word.length > 3 && !STOP.has(word) && !/^\d+$/.test(word));
}
/** Skills whose strong move is the seller's own prepared research or point of view. */
const POINT_OF_VIEW = new Set(['account_research', 'commercial_insight', 'value_messaging', 'answer_first', 'business_case']);
const sellerWords = new Set(
  [
    ...curriculum.skills.map((skill) => [skill.talk_track.strong, skill.talk_track.weak, skill.talk_track.pin, skill.talk_track.settle, skill.talk_track.assume, skill.rep.off_move].join(' ')),
    ...Object.values(curriculum.room.objection_moves)
  ].flatMap((text) => words(text))
);
/** Words that only the account's own people would know: from its buyer lines, not the generic seller playbook. */
function accountTerms(clusterId: ClusterId, verticalId: VerticalId): Set<string> {
  const vertical = curriculum.verticals[verticalId];
  const scenario = scenarioFor(curriculum, clusterId, verticalId);
  const corpus = JSON.stringify([vertical.buyer_reveals, vertical.signature_objections, vertical.rep_overrides ?? {}, vertical.talk_tracks, scenario.consumption_profile, scenario.workload]);
  return new Set(words(corpus).filter((word) => !sellerWords.has(word) && !COMMON.has(word)));
}
const known = (context: Set<string>, word: string) => [...context].some((seen) => seen.startsWith(word.slice(0, Math.min(5, word.length))));

type Strategy = { name: string; pick: (rs: RoomState, attempts: number) => MoveKind };
const STRATEGIES: Strategy[] = [
  { name: 'elite', pick: () => 'elite' },
  { name: 'weak first', pick: (_, attempts) => (attempts === 0 ? 'weak' : 'elite') },
  { name: 'trap first', pick: (_, attempts) => (attempts === 0 ? 'trap' : 'elite') },
  { name: 'weak, then trap', pick: (_, attempts) => (attempts === 0 ? 'weak' : attempts === 1 ? 'trap' : 'elite') }
];

function play(rc: RoomContext, start: RoomState, strategy: Strategy, onBeat?: (rs: RoomState) => void): RoomState {
  let rs = start;
  for (let step = 0; step < 120 && !roomDone(rs); step += 1) {
    onBeat?.(rs);
    const beat = currentBeat(rc, rs)!;
    const want = strategy.pick(rs, rs.attempts);
    const index = beat.moves.findIndex((move) => move.kind === want);
    rs = chooseMove(rc, rs, index >= 0 ? index : beat.moves.findIndex((move) => move.kind === 'elite')).state;
  }
  expect(roomDone(rs)).toBe(true);
  return rs;
}

function sessions(): { where: string; clusterId: ClusterId; verticalId: VerticalId; tier: Tier; drillIndex: number }[] {
  return CLUSTER_IDS.flatMap((clusterId) =>
    VERTICAL_IDS.flatMap((verticalId) =>
      TIERS.flatMap((tier) => [0, 1, 2].map((drillIndex) => ({ where: `${clusterId} x ${verticalId}, tier ${tier} drill ${drillIndex + 1}`, clusterId, verticalId, tier, drillIndex })))
    )
  );
}

function sixWordRuns(text: string): string[] {
  const tokens = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return tokens.slice(0, Math.max(0, tokens.length - 5)).map((_, i) => tokens.slice(i, i + 6).join(' '));
}

describe('dialogue: written lines', () => {
  it('uses no canned or gushing phrasing in any buyer line', () => {
    for (const verticalId of VERTICAL_IDS) {
      for (const line of buyerLines(verticalId)) {
        for (const pattern of BANNED) expect(pattern.test(line), `${verticalId}: "${line}" matches ${pattern}`).toBe(false);
      }
    }
  });

  it('never reuses a buyer reply or line, so no reaction can repeat', () => {
    for (const verticalId of VERTICAL_IDS) {
      const seen = new Map<string, number>();
      for (const line of buyerLines(verticalId)) seen.set(line, (seen.get(line) ?? 0) + 1);
      const repeated = [...seen.entries()].filter(([, count]) => count > 1).map(([line]) => line);
      expect(repeated, verticalId).toEqual([]);
    }
  });

  it('gives every skill a written reply to the weak and trap moves, and to the strong move unless it always earns a reveal', () => {
    for (const skill of curriculum.skills) {
      expect(skill.rep.replies.weak, skill.id).toBeTruthy();
      expect(skill.rep.replies.trap, skill.id).toBeTruthy();
      if (!skill.signal && !skill.probes) expect(skill.rep.replies.elite, skill.id).toBeTruthy();
      if (skill.talk_track.settle) expect(skill.rep.replies.settle, `${skill.id} needs a reply to its settle move`).toBeTruthy();
      if (skill.talk_track.assume) expect(skill.rep.replies.assume, `${skill.id} needs a reply to its assume move`).toBeTruthy();
    }
  });
});

describe('dialogue: every session on every path', () => {
  it('never says a line twice, answers every move, and keeps the reply with the person addressed', () => {
    for (const { where, clusterId, verticalId, tier, drillIndex } of sessions()) {
      for (const strategy of STRATEGIES) {
        const { rc, state } = setUpRoom(curriculum, { clusterId, verticalId, tier, mode: 'drill', drillIndex });
        const end = play(rc, state, strategy);
        const turns = end.sim.turns;
        const label = `${where} (${strategy.name})`;
        const contents = turns.map((turn) => turn.content);
        const repeated = contents.filter((content, index) => contents.indexOf(content) !== index);
        expect(repeated, `${label}: repeated lines`).toEqual([]);
        turns.forEach((turn, index) => {
          if (turn.speaker !== 'learner') return;
          const next: Turn | undefined = turns[index + 1];
          expect(next?.speaker, `${label}: "${turn.content}" got no answer`).toBe('buyer');
          // A written reply (not evidence and not an objection) comes from whoever the learner was answering.
          if (rc.arc || !next || next.reveal || next.objection) return;
          const addressed = turns.slice(0, index).reverse().find((candidate) => candidate.speaker === 'buyer');
          if (addressed) expect(next.speakerRole, `${label}: reply to "${turn.content}"`).toBe(addressed.speakerRole);
        });
        const buyers = turns.filter((turn) => turn.speaker === 'buyer');
        const runs = new Map<string, string>();
        for (const turn of buyers) {
          for (const run of new Set(sixWordRuns(turn.content))) {
            const earlier = runs.get(run);
            expect(earlier, `${label}: "${turn.content}" echoes "${earlier}"`).toBeUndefined();
            runs.set(run, turn.content);
          }
        }
      }
    }
  });

  it('never offers a move that names an account fact before the buyer or the brief has raised it', () => {
    for (const { where, clusterId, verticalId, tier, drillIndex } of sessions()) {
      const { rc, state, payload } = setUpRoom(curriculum, { clusterId, verticalId, tier, mode: 'drill', drillIndex });
      if (rc.arc) continue; // Authored arcs pass their own gate in arc-quality.test.ts.
      const drill = curriculum.rubrics[tier].drills[drillIndex]!;
      const brief = [scenarioFor(curriculum, clusterId, verticalId).situation, drill.title, drill.prompt, ...payload.personas.map((persona) => persona.role)].join(' ');
      const terms = accountTerms(clusterId, verticalId);
      for (const strategy of STRATEGIES) {
        play(rc, state, strategy, (rs) => {
          const beat = currentBeat(rc, rs)!;
          if (beat.skillId && POINT_OF_VIEW.has(beat.skillId)) return;
          const context = new Set(words(`${brief} ${rs.sim.turns.map((turn) => turn.content).join(' ')}`));
          for (const move of beat.moves) {
            const early = words(move.text).filter((word) => terms.has(word) && !known(context, word));
            expect(early, `${where} (${strategy.name}): "${move.text}" names ${early.join(', ')} before anyone raised it`).toEqual([]);
          }
        });
      }
    }
  });
});
