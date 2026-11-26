import type { Curriculum } from './curriculum/load';
import type { ArcBeat, ArcPillar } from './curriculum/schema';
import type { AppState, SessionMiss, SharpenItem } from './store';

/**
 * Spaced retrieval for missed moves. A move missed in the deal room comes back in daily
 * reps the next day, then after 3 and 7 more days. Three clean recalls in a row retire it,
 * and a miss starts the spacing again. Reps never hold more than a few of these at once,
 * so practice stays short and mixed rather than a grind of the same questions.
 */
export const SHARPEN_GAPS = [1, 3, 7] as const;
export const SHARPEN_PER_SET = 3;

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Queues each missed beat for tomorrow. A beat already queued starts its spacing again. */
export function queueMisses(state: AppState, trajectoryId: string, misses: SessionMiss[], today: string): AppState {
  if (misses.length === 0) return state;
  const missed = new Set(misses.map((miss) => miss.beatId));
  const kept = (state.sharpen ?? []).filter((item) => !(item.trajectoryId === trajectoryId && missed.has(item.beatId)));
  const unique = [...new Map(misses.map((miss) => [miss.beatId, miss] as const)).values()];
  const added: SharpenItem[] = unique.map((miss) => ({ trajectoryId, ...miss, due: addDays(today, SHARPEN_GAPS[0]), reviews: 0 }));
  return { ...state, sharpen: [...kept, ...added] };
}

/** Moves due today for this path, oldest first, at most a few per set. */
export function dueSharpen(state: AppState, trajectoryId: string, today: string, max: number = SHARPEN_PER_SET): SharpenItem[] {
  return (state.sharpen ?? [])
    .filter((item) => item.trajectoryId === trajectoryId && item.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, max);
}

/** Moves queued for later, for the "coming back tomorrow" line on the recap. */
export function queuedSharpen(state: AppState, trajectoryId: string): SharpenItem[] {
  return (state.sharpen ?? []).filter((item) => item.trajectoryId === trajectoryId);
}

/** Records recall results by beat id: a clean recall widens the gap or retires the move, a miss resets it. */
export function reviewSharpen(state: AppState, trajectoryId: string, results: Record<string, boolean>, today: string): AppState {
  const next: SharpenItem[] = [];
  for (const item of state.sharpen ?? []) {
    const result = item.trajectoryId === trajectoryId ? results[item.beatId] : undefined;
    if (result === undefined) next.push(item);
    else if (!result) next.push({ ...item, reviews: 0, due: addDays(today, SHARPEN_GAPS[0]) });
    else if (item.reviews + 1 < SHARPEN_GAPS.length) next.push({ ...item, reviews: item.reviews + 1, due: addDays(today, SHARPEN_GAPS[item.reviews + 1]!) });
  }
  return { ...state, sharpen: next };
}

/** Finds an authored beat by id across a trajectory's arc. */
export function findArcBeat(curriculum: Curriculum, trajectoryId: string, beatId: string): { beat: ArcBeat; pillar: ArcPillar; scene: string } | null {
  const arc = curriculum.arcs[trajectoryId];
  if (!arc) return null;
  for (const pillar of arc.pillars) {
    for (const scene of [...pillar.drills, pillar.capstone]) {
      const beat = scene.beats.find((candidate) => candidate.id === beatId);
      if (beat) return { beat, pillar, scene: scene.title };
    }
  }
  return null;
}
