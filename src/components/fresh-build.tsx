'use client';

import { useEffect } from 'react';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Keeps open tabs on the current release. The app is a static site whose pages navigate on the
 * client, so a tab opened before a deploy keeps running the old code until it reloads. On load
 * and whenever the tab comes back into view, this checks version.json and reloads once if a newer
 * build is live. Progress lives in localStorage, so a reload loses nothing.
 */
export function FreshBuild() {
  useEffect(() => {
    if (BUILD_ID === 'dev') return;
    const check = async () => {
      try {
        const response = await fetch(`${BASE_PATH}/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return;
        const { id } = (await response.json()) as { id?: string };
        if (!id || id === BUILD_ID) return;
        // Reload at most once per new build, so a CDN serving mixed versions cannot loop.
        const key = 'deal-master:reloaded-for';
        if (window.sessionStorage.getItem(key) === id) return;
        window.sessionStorage.setItem(key, id);
        window.location.reload();
      } catch {
        // Offline or blocked: keep running the current build.
      }
    };
    void check();
    const onVisible = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return null;
}
