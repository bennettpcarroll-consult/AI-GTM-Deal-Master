import { TIERS } from '@/lib/curriculum/schema';
import { RecapPage } from './recap-page';

/** Pre-renders each pillar recap so the app also works as a static export. */
export function generateStaticParams() {
  return TIERS.map((tier) => ({ tier: String(tier) }));
}

export const dynamicParams = false;

export default function Page() {
  return <RecapPage />;
}
