import { describe, expect, it } from 'vitest';
import { buildCurriculum, CurriculumError, CURRICULUM_SOURCES, loadCurriculum } from '../../src/lib/curriculum/load';
import { CLUSTER_IDS, TIERS, VERTICAL_IDS } from '../../src/lib/curriculum/schema';
import { composeScenario, interleave, trajectoryId } from '../../src/lib/composer';

const curriculum = loadCurriculum();

describe('curriculum packs', () => {
  it('loads 5 clusters, 4 verticals, 5 frameworks, and 4 tier rubrics', () => {
    expect(Object.keys(curriculum.clusters)).toHaveLength(5);
    expect(Object.keys(curriculum.verticals)).toHaveLength(4);
    expect(Object.keys(curriculum.frameworks)).toHaveLength(5);
    expect(Object.keys(curriculum.rubrics)).toHaveLength(4);
  });

  it('composes every cluster x vertical trajectory for every tier, mode, and drill', () => {
    const ids = new Set<string>();
    let scenarios = 0;
    for (const clusterId of CLUSTER_IDS) {
      for (const verticalId of VERTICAL_IDS) {
        ids.add(trajectoryId(clusterId, verticalId));
        for (const tier of TIERS) {
          const rubric = curriculum.rubrics[tier];
          const boss = composeScenario({
            cluster: curriculum.clusters[clusterId],
            vertical: curriculum.verticals[verticalId],
            rubric,
            mode: 'boss'
          });
          expect(boss.objection_queue.length).toBeGreaterThan(0);
          expect(boss.personas).toHaveLength(rubric.boss_fight.persona_count);
          expect(boss.target_signals).toHaveLength(8);
          scenarios += 1;
          rubric.drills.forEach((drill, drillIndex) => {
            const payload = composeScenario({
              cluster: curriculum.clusters[clusterId],
              vertical: curriculum.verticals[verticalId],
              rubric,
              mode: 'drill',
              drillIndex
            });
            expect(payload.target_signals).toEqual(drill.target_signals);
            scenarios += 1;
          });
        }
      }
    }
    expect(ids.size).toBe(20);
    expect(scenarios).toBe(20 * 4 * 4);
  });

  it('is deterministic for the same inputs', () => {
    const input = {
      cluster: curriculum.clusters.vertical_agents,
      vertical: curriculum.verticals.consumer_brands,
      rubric: curriculum.rubrics[2],
      mode: 'boss' as const
    };
    expect(composeScenario(input)).toEqual(composeScenario(input));
  });

  it('merges vertical and cluster objections without duplicates, alternating between them', () => {
    expect(interleave(['a', 'b'], ['x', 'y', 'z', 'b'])).toEqual(['a', 'x', 'b', 'y', 'z']);
  });

  it('rejects a rubric whose regular expression does not compile', () => {
    const sources = CURRICULUM_SOURCES.map((source) => {
      if (source.file !== 'rubrics/tier_1_inspector.json') return source;
      const broken = JSON.parse(JSON.stringify(source.data).replace('"is (our|my) champion"', '"is (our|my champion"')) as unknown;
      return { ...source, data: broken };
    });
    expect(() => buildCurriculum(sources)).toThrow(CurriculumError);
  });

  it('rejects a missing tier rubric', () => {
    const sources = CURRICULUM_SOURCES.filter((source) => source.file !== 'rubrics/tier_4_closer.json');
    expect(() => buildCurriculum(sources)).toThrow(/missing rubric for tier 4/);
  });

  it('rejects a rubric that references an unknown framework', () => {
    const sources = CURRICULUM_SOURCES.map((source) => {
      if (source.file !== 'rubrics/tier_2_challenger.json') return source;
      const data = JSON.parse(JSON.stringify(source.data).replace('"challenger"', '"not_a_framework"')) as unknown;
      return { ...source, data };
    });
    expect(() => buildCurriculum(sources)).toThrow(/unknown framework "not_a_framework"/);
  });
});
