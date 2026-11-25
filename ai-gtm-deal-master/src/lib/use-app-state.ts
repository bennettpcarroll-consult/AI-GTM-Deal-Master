'use client';

import { useCallback, useEffect, useState } from 'react';
import { CHANGE_EVENT } from './constants';
import { loadAppState, saveAppState } from './persistence';
import type { AppState } from './store';

export type UpdateAppState = (change: (state: AppState) => AppState) => AppState;

export function useAppState(): { state: AppState | null; update: UpdateAppState } {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    const sync = () => setState(loadAppState());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = useCallback<UpdateAppState>((change) => {
    const next = change(loadAppState());
    saveAppState(next);
    return next;
  }, []);

  return { state, update };
}
