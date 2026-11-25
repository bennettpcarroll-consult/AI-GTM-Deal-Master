import type { AppState, Engagement } from './store';

/** Reps a learner aims for each day. A drill or boss fight counts as one rep. */
export const DAILY_GOAL = 5;
/** Points per piece of verified buyer proof. */
export const POINTS_PER_PROOF = 10;

export function emptyEngagement(): Engagement {
  return { streak: 0, lastActiveDay: null, today: null, repsToday: 0, points: 0, repSkills: [] };
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return dayKey(new Date(y, m - 1, d - 1));
}

/** The engagement counters as they read on `today`, so a missed day shows a broken streak. */
export function currentEngagement(state: AppState, today: string = dayKey()): Engagement {
  const engagement = state.engagement ?? emptyEngagement();
  const repsToday = engagement.today === today ? engagement.repsToday : 0;
  const alive = engagement.lastActiveDay === today || (engagement.lastActiveDay !== null && engagement.lastActiveDay === previousDay(today));
  return { ...engagement, today, repsToday, streak: alive ? engagement.streak : 0 };
}

/**
 * Records practice. Any rep keeps the streak alive for the day.
 * Points are added only for verified buyer proof, passed in by the caller.
 */
export function recordActivity(
  state: AppState,
  activity: { reps: number; proofs: number; skills?: string[] },
  today: string = dayKey()
): AppState {
  const before = state.engagement ?? emptyEngagement();
  let streak = before.streak;
  if (before.lastActiveDay !== today) {
    streak = before.lastActiveDay === previousDay(today) ? before.streak + 1 : 1;
  }
  const repsToday = (before.today === today ? before.repsToday : 0) + activity.reps;
  const repSkills = [...new Set([...before.repSkills, ...(activity.skills ?? [])])];
  return {
    ...state,
    engagement: {
      streak,
      lastActiveDay: today,
      today,
      repsToday,
      points: before.points + activity.proofs * POINTS_PER_PROOF,
      repSkills
    }
  };
}
