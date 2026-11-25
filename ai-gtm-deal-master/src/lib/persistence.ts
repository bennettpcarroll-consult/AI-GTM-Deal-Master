import { CHANGE_EVENT, STORAGE_KEY } from './constants';
import { emptyAppState, type AppState } from './store';

function isAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { version?: unknown; trajectories?: unknown };
  return candidate.version === 1 && Array.isArray(candidate.trajectories);
}

/** The only module that touches localStorage. */
export function loadAppState(): AppState {
  if (typeof window === 'undefined') return emptyAppState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAppState();
    const parsed: unknown = JSON.parse(raw);
    return isAppState(parsed) ? parsed : emptyAppState();
  } catch {
    return emptyAppState();
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
