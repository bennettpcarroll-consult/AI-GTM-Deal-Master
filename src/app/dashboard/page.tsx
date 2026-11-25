'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loading } from '@/components/ui';

/** The dashboard became the path. Old links still land in the right place. */
export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => router.replace('/path'), [router]);
  return <Loading />;
}
