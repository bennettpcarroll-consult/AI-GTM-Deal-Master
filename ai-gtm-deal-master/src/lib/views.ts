import { loadCurriculum, type Curriculum } from './curriculum/load';
import type { ClusterId, VerticalId } from './curriculum/schema';
import { drillKey } from './store';

export function trajectoryLabel(trajectory: { clusterId: ClusterId; verticalId: VerticalId }): string {
  const curriculum = loadCurriculum();
  return `${curriculum.clusters[trajectory.clusterId].display_name} × ${curriculum.verticals[trajectory.verticalId].short_name}`;
}

/** Drill keys that a new trajectory may credit on placement. */
export function placementCreditKeys(curriculum: Curriculum): string[] {
  return curriculum.rubrics[1].drills
    .filter((drill) => drill.placement_credit_eligible)
    .map((drill) => drillKey(1, drill.id));
}
