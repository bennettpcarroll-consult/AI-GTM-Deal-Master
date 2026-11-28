import { describe, expect, it } from 'vitest';
import { loadCurriculum } from '../../src/lib/curriculum/load';
import { CLUSTER_IDS, VERTICAL_IDS, type Tier } from '../../src/lib/curriculum/schema';
import { chooseMove, currentBeat, roomDone, setUpRoom } from '../../src/lib/deal-room';
import { dailyReps, buildCurveball } from '../../src/lib/skills';

/**
 * Guards from the CRO audit (2026-11-28): distractors are realistic seller traps, no path shows
 * another vertical's facts, Pillar 03 plays new situations, and reps never replay a deal-room line.
 */
const curriculum = loadCurriculum();

/** Strawman lines no enterprise seller would pick. Add to this list, never remove from it. */
const STRAWMEN = [/tell me (a bit )?about your company/i, /not looked into/i, /walk me through the basics/i, /30-slide/i, /nobody in this space/i, /trust me/i, /company history/i];

function sellerDistractors(): string[] {
  return curriculum.skills.flatMap((skill) => [skill.talk_track.weak, skill.talk_track.settle, skill.talk_track.assume, skill.rep.off_move, skill.curveball.weak, skill.curveball.trap].filter((line): line is string => Boolean(line)));
}

/** Words that mark one vertical's world. Any of them on a shared line would leak into the other paths. */
const VERTICAL_MARKERS: Record<(typeof VERTICAL_IDS)[number], RegExp> = {
  banking_fsi: /\b(fraud|banks?|alerts?|examiners?|model risk|kyc|aml|false positives?|analysts|analyst hours)\b/i,
  consumer_brands: /\b(holiday|carts?|checkout|shoppers?|pci|brand sites?|peak season)\b/i,
  insurance: /\b(claims?|adjusters?|underwrit\w*|policyholders?|actuar\w*|loss ratio|catastrophe)\b/i,
  law_firms: /\b((?<!what )matters|associates|litigation|billable|realization|write-offs?|ethical walls?|partnership)\b/i
};

describe('audit: distractors', () => {
  it('offers B-grade seller traps, never strawmen', () => {
    for (const line of sellerDistractors()) for (const pattern of STRAWMEN) expect(pattern.test(line), `"${line}" is a strawman`).toBe(false);
  });

  it('keeps every curveball option within 2x the length of the others, so length never gives the answer away', () => {
    for (const skill of curriculum.skills) {
      const lengths = [skill.curveball.elite, skill.curveball.weak, skill.curveball.trap].map((line) => line.length);
      expect(Math.max(...lengths) / Math.min(...lengths), skill.id).toBeLessThanOrEqual(2);
    }
  });
});

describe('audit: vertical scoping', () => {
  it('keeps skill defaults, briefs and curveballs free of any one vertical\'s facts', () => {
    const shared = curriculum.skills.flatMap((skill) => [
      skill.talk_track.strong,
      skill.talk_track.weak,
      skill.talk_track.proof,
      skill.talk_track.pin,
      skill.talk_track.settle,
      skill.talk_track.assume,
      skill.rep.off_move,
      skill.rep.buyer_line,
      ...Object.values(skill.rep.replies),
      ...Object.values(skill.curveball)
    ]);
    const rubricCopy = Object.values(curriculum.rubrics).flatMap((rubric) => rubric.drills.flatMap((drill) => [drill.title, drill.prompt]));
    for (const line of [...shared, ...rubricCopy]) {
      if (!line) continue;
      for (const [vertical, marker] of Object.entries(VERTICAL_MARKERS)) expect(marker.test(line), `"${line}" shows ${vertical} copy on every path`).toBe(false);
    }
  });
});

describe('audit: no repeated questions', () => {
  it('reps play executive curveballs that never repeat a deal-room line', () => {
    const roomLines = new Set<string>();
    for (const skill of curriculum.skills) {
      for (const line of [skill.talk_track.strong, skill.talk_track.weak, skill.talk_track.pin, skill.talk_track.settle, skill.talk_track.assume, skill.rep.buyer_line, skill.rep.off_move]) if (line) roomLines.add(line);
    }
    for (const vertical of Object.values(curriculum.verticals)) {
      for (const ladder of Object.values(vertical.talk_tracks)) [ladder.open, ladder.pin].forEach((line) => roomLines.add(line));
      for (const override of Object.values(vertical.rep_overrides ?? {})) [override.strong, override.buyer_line].forEach((line) => line && roomLines.add(line));
    }
    const reps = dailyReps(curriculum, {}, '2026-11-28', curriculum.skills.length);
    expect(reps).toHaveLength(curriculum.skills.length);
    for (const rep of reps) {
      for (const line of [rep.prompt, ...rep.options]) expect(roomLines.has(line), `rep replays "${line}"`).toBe(false);
      expect(rep.speaker).toBeTruthy();
    }
    const curveballLines = curriculum.skills.flatMap((skill) => Object.values(buildCurveball(skill, 'x').options));
    expect(new Set(curveballLines).size).toBe(curveballLines.length);
  });

  it('plays Pillar 03 as post-land expansion: no buyer line or elite move from Pillar 01 on any generated path', () => {
    const play = (clusterId: (typeof CLUSTER_IDS)[number], verticalId: (typeof VERTICAL_IDS)[number], tier: Tier) => {
      const lines = new Set<string>();
      for (const drillIndex of [0, 1, 2]) {
        const { rc, state } = setUpRoom(curriculum, { clusterId, verticalId, tier, mode: 'drill', drillIndex });
        if (rc.arc) return null;
        let rs = state;
        for (let step = 0; step < 120 && !roomDone(rs); step += 1) {
          const beat = currentBeat(rc, rs)!;
          if (beat.signal) lines.add(beat.moves.find((move) => move.kind === 'elite')!.text);
          rs = chooseMove(rc, rs, beat.moves.findIndex((move) => move.kind === 'elite')).state;
        }
        rs.sim.turns.filter((turn) => turn.speaker === 'buyer').forEach((turn) => lines.add(turn.content));
      }
      return lines;
    };
    for (const clusterId of CLUSTER_IDS) {
      for (const verticalId of VERTICAL_IDS) {
        const first = play(clusterId, verticalId, 1);
        const third = play(clusterId, verticalId, 3);
        if (!first || !third) continue;
        const repeated = [...third].filter((line) => first.has(line));
        expect(repeated, `${clusterId} x ${verticalId}: Pillar 03 replays Pillar 01`).toEqual([]);
      }
    }
  });

  it('gives Pillar 03 its own drill titles, distinct from every other pillar', () => {
    const titles = ([1, 2, 4] as Tier[]).flatMap((tier) => curriculum.rubrics[tier].drills.map((drill) => drill.title));
    for (const drill of curriculum.rubrics[3].drills) expect(titles).not.toContain(drill.title);
  });
});

describe('audit: reviewer mode', () => {
  it('opens every pillar for a reviewer without touching progress, and closes again', async () => {
    const { addOrActivateTrajectory, emptyAppState, setReviewer, tierUnlocked } = await import('../../src/lib/store');
    const state = addOrActivateTrajectory(emptyAppState(), 'foundation_models', 'consumer_brands', []);
    const trajectory = state.trajectories[0]!;
    expect(tierUnlocked(trajectory, 4, state.reviewer)).toBe(false);
    const reviewing = setReviewer(state, true);
    expect(tierUnlocked(reviewing.trajectories[0]!, 4, reviewing.reviewer)).toBe(true);
    expect(reviewing.trajectories).toEqual(state.trajectories);
    expect(setReviewer(reviewing, false).reviewer).toBe(false);
  });
});
