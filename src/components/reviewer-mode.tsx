'use client';

import { useEffect } from 'react';
import { setReviewer } from '@/lib/store';
import { useAppState } from '@/lib/use-app-state';

/**
 * Reviewer mode for hiring managers and peers: any page opened with ?preview=1 opens every
 * pillar, and ?preview=0 closes it again. Progress is never touched.
 */
export function ReviewerMode() {
  const { update } = useAppState();
  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('preview');
    if (preview === '1' || preview === '0') update((current) => setReviewer(current, preview === '1'));
  }, [update]);
  return null;
}
