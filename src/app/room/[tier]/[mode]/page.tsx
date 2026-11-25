import { TIERS } from '@/lib/curriculum/schema';
import { RoomPage } from './room-page';

const MODES = ['drill-1', 'drill-2', 'drill-3', 'boss'] as const;

/** Pre-renders every drill and boss route so the app also works as a static export. */
export function generateStaticParams() {
  return TIERS.flatMap((tier) => MODES.map((mode) => ({ tier: String(tier), mode })));
}

export const dynamicParams = false;

export default function Page() {
  return <RoomPage />;
}
