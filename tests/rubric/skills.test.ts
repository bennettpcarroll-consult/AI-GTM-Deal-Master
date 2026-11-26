import { describe, expect, it } from 'vitest';
import { buildCurriculum, CurriculumError, CURRICULUM_SOURCES, loadCurriculum, scenarioFor, signalDefinitions } from '../../src/lib/curriculum/load';
import { CLUSTER_IDS, SIGNAL_IDS, VERTICAL_IDS } from '../../src/lib/curriculum/schema';
import { composeScenario } from '../../src/lib/composer';
import { sendLearnerMessage, startSimulation, type SimContext } from '../../src/lib/simulator';
import { gradeSession } from '../../src/lib/grader';
import { addOrActivateTrajectory, emptyAppState, recordSession, type SessionRecord } from '../../src/lib/store';
import { currentEngagement, POINTS_PER_PROOF, recordActivity } from '../../src/lib/engagement';
import { lessonQuizQuestions } from '../../src/lib/questions';
import {
  buildRep,
  buildSkillProbes,
  dailyReps,
  diagnosticQuestions,
  drillSkillIds,
  masteryMap,
  pathDrillSkillIds,
  proofCount,
  skillMastery,
  whereTaught
} from '../../src/lib/skills';

const curriculum = loadCurriculum();

function consumptionContext(tier: 1 | 2 | 3 | 4, mode: 'drill' | 'boss', drillIndex = 0) {
  const cluster = curriculum.clusters.data_context;
  const vertical = curriculum.verticals.insurance;
  const rubric = curriculum.rubrics[tier];
  const payload = composeScenario({ cluster, vertical, rubric, mode, drillIndex });
  const ctx: SimContext = {
    vertical,
    signals: signalDefinitions(curriculum),
    objections: payload.objection_queue,
    personaRoles: payload.personas.map((persona) => persona.role),
    skillProbes: buildSkillProbes(curriculum, scenarioFor(curriculum, cluster.id, vertical.id))
  };
  return { ctx, rubric, state: startSimulation(ctx, { mode, targetSignals: payload.target_signals }) };
}

describe('skill model', () => {
  it('defines 24 skills in 4 families, and every MEDDPICC signal maps to one skill', () => {
    expect(curriculum.families.map((family) => family.id)).toEqual(['fundamentals', 'meddpicc', 'consumption', 'executive']);
    expect(curriculum.skills).toHaveLength(24);
    for (const signal of SIGNAL_IDS) {
      expect(curriculum.skills.filter((skill) => skill.signal === signal)).toHaveLength(1);
    }
  });

  it('teaches every skill in at least one drill, with a talk track', () => {
    for (const skill of curriculum.skills) {
      expect(whereTaught(curriculum, skill.id).length, skill.id).toBeGreaterThan(0);
      expect(skill.talk_track.strong).not.toEqual(skill.talk_track.weak);
    }
  });

  it('has a scenario with a consumption profile for all 20 cluster and vertical pairs', () => {
    for (const clusterId of CLUSTER_IDS) {
      for (const verticalId of VERTICAL_IDS) {
        expect(scenarioFor(curriculum, clusterId, verticalId).consumption_profile.reveals.forecast.verbatim).toBeTruthy();
      }
    }
  });

  it('rejects a drill that points at an unknown skill', () => {
    const sources = CURRICULUM_SOURCES.map((source) => {
      if (source.file !== 'rubrics/tier_1_inspector.json') return source;
      const data = structuredClone(source.data) as { drills: { practices_skills: string[] }[] };
      data.drills[0]!.practices_skills = ['made_up_skill'];
      return { ...source, data };
    });
    expect(() => buildCurriculum(sources)).toThrow(CurriculumError);
  });

  it('lists the MEDDPICC targets and practiced skills for a drill', () => {
    expect(drillSkillIds(curriculum, curriculum.rubrics[1], 0)).toEqual(['metrics', 'economic_buyer', 'account_research', 'discovery_questioning', 'upfront_contract']);
  });
});

describe('consumption evidence', () => {
  it('reveals a forecast only from the buyer, and needs a second verbatim probe for full proof', () => {
    const { ctx, state } = consumptionContext(3, 'drill', 2);
    const first = sendLearnerMessage(ctx, state, 'How many claims documents do you process per month?');
    expect(first.skillEvidence.usage_forecast?.level).toBe('partial');
    const second = sendLearnerMessage(ctx, first, 'What volume do you see today, and what do you expect next year?');
    const evidence = second.skillEvidence.usage_forecast;
    expect(evidence?.level).toBe('verbatim');
    const turn = second.turns.find((candidate) => candidate.id === evidence?.transcript_turn_id);
    expect(turn?.speaker).toBe('buyer');
    expect(turn?.content).toContain('400,000 claims documents a month');
  });

  it('never raises skill evidence from learner text alone', () => {
    const { ctx, state } = consumptionContext(3, 'drill', 2);
    const next = sendLearnerMessage(ctx, state, 'Our product is great and you will love it.');
    expect(next.skillEvidence).toEqual({});
  });

  it('flags a commit proposed before any volume question in the consumption boss fight', () => {
    const { ctx, rubric, state } = consumptionContext(3, 'boss');
    const next = sendLearnerMessage(ctx, state, 'I suggest you sign a three-year commit with us today.');
    const grade = gradeSession(rubric, next);
    expect(grade.autoFails.map((flag) => flag.id)).toContain('commit_without_forecast');
  });
});

describe('mastery, reps and engagement', () => {
  const base = addOrActivateTrajectory(emptyAppState(), 'data_context', 'insurance', [], '2026-11-25T00:00:00Z');
  const trajectory = base.trajectories[0]!;

  it('starts every skill at level 1 and raises it to 2 from a correct diagnostic answer', () => {
    expect(new Set(Object.values(masteryMap(curriculum, base, trajectory)))).toEqual(new Set([1]));
    const withDiagnostic = { ...base, diagnostic: { completedAt: 'x', answers: { metrics: true } } };
    expect(skillMastery(curriculum, withDiagnostic, trajectory, 'metrics')).toBe(2);
  });

  it('marks a skill proven after a passed drill and certified after a passed boss fight', () => {
    const record = (mode: 'drill' | 'boss', drillId: string | null): SessionRecord => ({
      id: `s-${mode}`,
      tier: 1,
      mode,
      drillId,
      score: 100,
      passed: true,
      autoFailIds: [],
      bindings: {} as SessionRecord['bindings'],
      transcript: [],
      createdAt: '2026-11-25T00:00:00Z'
    });
    const afterDrill = recordSession(base, trajectory.id, record('drill', 'd1'));
    expect(skillMastery(curriculum, afterDrill, afterDrill.trajectories[0], 'metrics')).toBe(3);
    const afterBoss = recordSession(afterDrill, trajectory.id, record('boss', null));
    expect(skillMastery(curriculum, afterBoss, afterBoss.trajectories[0], 'champion')).toBe(4);
  });

  it('builds reps with exactly one strong reply, in a stable order', () => {
    const skill = curriculum.skills[0]!;
    const rep = buildRep(skill, 'seed');
    expect(rep.options).toHaveLength(3);
    expect(rep.options[rep.answer]).toBe(skill.talk_track.strong);
    expect(buildRep(skill, 'seed')).toEqual(rep);
    expect(diagnosticQuestions(curriculum)).toHaveLength(12);
    expect(dailyReps(curriculum, {}, '2026-11-25')).toHaveLength(5);
  });

  it('counts points only from buyer proof', () => {
    expect(proofCount({ bindings: { metrics: { bars: 4 }, champion: { bars: 3 } }, skillEvidence: { usage_forecast: { level: 'verbatim' } } })).toBe(2);
    const state = recordActivity(base, { reps: 1, proofs: 2 }, '2026-11-25');
    expect(state.engagement?.points).toBe(2 * POINTS_PER_PROOF);
    const reps = recordActivity(state, { reps: 3, proofs: 0 }, '2026-11-25');
    expect(reps.engagement?.points).toBe(2 * POINTS_PER_PROOF);
    expect(reps.engagement?.repsToday).toBe(4);
  });

  it('grows the streak on consecutive days and resets it after a missed day', () => {
    let state = recordActivity(base, { reps: 1, proofs: 0 }, '2026-11-24');
    state = recordActivity(state, { reps: 1, proofs: 0 }, '2026-11-25');
    expect(state.engagement?.streak).toBe(2);
    expect(currentEngagement(state, '2026-11-26').streak).toBe(2);
    expect(currentEngagement(state, '2026-11-27').streak).toBe(0);
    expect(recordActivity(state, { reps: 1, proofs: 0 }, '2026-11-28').engagement?.streak).toBe(1);
  });
});

describe('talk tracks the coach teaches', () => {
  // QA found the metrics hint line drew a generic reply. The strong move a learner is
  // taught must always draw at least a partial buyer reveal for its own signal.
  it('every MEDDPICC strong move draws a buyer reveal for its signal', () => {
    for (const skill of curriculum.skills.filter((candidate) => candidate.signal)) {
      const signal = skill.signal!;
      const { ctx } = consumptionContext(1, 'drill');
      const state = startSimulation(ctx, { mode: 'drill', targetSignals: [signal] });
      const next = sendLearnerMessage(ctx, state, skill.talk_track.strong);
      expect(next.bindings[signal].bars, `${skill.id}: "${skill.talk_track.strong}"`).toBeGreaterThanOrEqual(3);
      const reveal = next.turns.find((turn) => turn.signal === signal);
      expect(reveal?.speaker).toBe('buyer');
    }
  });

  it('the metrics strong move followed by a sharper number question earns verbatim proof', () => {
    const { ctx } = consumptionContext(1, 'drill');
    let state = startSimulation(ctx, { mode: 'drill', targetSignals: ['metrics'] });
    state = sendLearnerMessage(ctx, state, 'What number has to move for this to be worth it, and by when?');
    state = sendLearnerMessage(ctx, state, 'How much do you need to cut this quarter?');
    expect(state.bindings.metrics.bars).toBe(4);
  });
});

describe('credit follows what the learner played', () => {
  const northbridge = { clusterId: 'agentic_harness', verticalId: 'banking_fsi' } as const;

  it('credits an authored drill with the skills its scenes play, never a rubric skill it skips', () => {
    const arcDrill = curriculum.arcs.agentic_harness__banking_fsi!.pillars[0]!.drills[0]!;
    expect(pathDrillSkillIds(curriculum, northbridge, 1, 0)).toEqual([...new Set(arcDrill.beats.map((beat) => beat.skill))]);
    // The rubric's drill 1 lists economic buyer and up-front contract; the Northbridge first meeting plays neither.
    expect(pathDrillSkillIds(curriculum, northbridge, 1, 0)).not.toContain('economic_buyer');
    expect(pathDrillSkillIds(curriculum, northbridge, 1, 0)).not.toContain('upfront_contract');
  });

  it('marks a skill proven only after a drill that played it', () => {
    const base = addOrActivateTrajectory(emptyAppState(), 'agentic_harness', 'banking_fsi', [], '2026-11-25T00:00:00Z');
    const passed: SessionRecord = { id: 's-1', tier: 1, mode: 'drill', drillId: curriculum.rubrics[1].drills[0]!.id, score: 100, passed: true, autoFailIds: [], bindings: {} as SessionRecord['bindings'], transcript: [], createdAt: '2026-11-25T00:00:00Z' };
    const after = recordSession(base, base.trajectories[0]!.id, passed);
    expect(skillMastery(curriculum, after, after.trajectories[0], 'account_research')).toBe(3);
    expect(skillMastery(curriculum, after, after.trajectories[0], 'economic_buyer')).toBeLessThan(3);
  });

  it('keeps generated paths on the rubric', () => {
    expect(pathDrillSkillIds(curriculum, { clusterId: 'data_context', verticalId: 'insurance' }, 1, 0)).toEqual(drillSkillIds(curriculum, curriculum.rubrics[1], 0));
  });

  it('moves the right briefing answer to a different slot on each question', () => {
    for (const cluster of Object.values(curriculum.clusters)) {
      const questions = lessonQuizQuestions(cluster.lesson, cluster.display_name);
      questions.forEach((question, index) => expect(question.options[question.answer]).toBe(cluster.lesson.quiz[index]!.options[cluster.lesson.quiz[index]!.answer]));
      expect(new Set(questions.map((question) => question.answer)).size, cluster.id).toBe(Math.min(questions.length, 3));
    }
  });
});
