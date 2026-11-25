import { buildCurriculum, CurriculumError, type Curriculum } from '../src/lib/curriculum/load';
import { composeScenario, trajectoryId } from '../src/lib/composer';
import { CLUSTER_IDS, TIERS, VERTICAL_IDS } from '../src/lib/curriculum/schema';

function loadOrReport(): Curriculum | null {
  try {
    return buildCurriculum();
  } catch (error) {
    if (error instanceof CurriculumError) {
      console.error(error.message);
      return null;
    }
    throw error;
  }
}

function main(): number {
  const curriculum = loadOrReport();
  if (!curriculum) return 1;

  const problems: string[] = [];
  const trajectories = new Set<string>();
  let scenarios = 0;

  for (const clusterId of CLUSTER_IDS) {
    for (const verticalId of VERTICAL_IDS) {
      trajectories.add(trajectoryId(clusterId, verticalId));
      for (const tier of TIERS) {
        const rubric = curriculum.rubrics[tier];
        const label = `${clusterId} x ${verticalId} tier ${tier}`;
        try {
          const boss = composeScenario({
            cluster: curriculum.clusters[clusterId],
            vertical: curriculum.verticals[verticalId],
            rubric,
            mode: 'boss'
          });
          scenarios += 1;
          if (boss.objection_queue.length === 0) problems.push(`${label}: boss scenario has no objections`);
          if (boss.personas.length !== rubric.boss_fight.persona_count) {
            problems.push(`${label}: expected ${rubric.boss_fight.persona_count} boss personas`);
          }
          rubric.drills.forEach((_, drillIndex) => {
            composeScenario({
              cluster: curriculum.clusters[clusterId],
              vertical: curriculum.verticals[verticalId],
              rubric,
              mode: 'drill',
              drillIndex
            });
            scenarios += 1;
          });
        } catch (error) {
          problems.push(`${label}: ${(error as Error).message}`);
        }
      }
    }
  }

  if (trajectories.size !== CLUSTER_IDS.length * VERTICAL_IDS.length) {
    problems.push(`expected ${CLUSTER_IDS.length * VERTICAL_IDS.length} trajectories, found ${trajectories.size}`);
  }

  if (problems.length > 0) {
    console.error(`Curriculum check failed with ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`- ${problem}`);
    return 1;
  }

  console.log(
    `Curriculum OK: ${CLUSTER_IDS.length} clusters, ${VERTICAL_IDS.length} verticals, ${Object.keys(curriculum.frameworks).length} frameworks, ${TIERS.length} rubrics.`
  );
  console.log(`Composed ${scenarios} scenarios across ${trajectories.size} cluster x vertical trajectories.`);
  return 0;
}

process.exitCode = main();
