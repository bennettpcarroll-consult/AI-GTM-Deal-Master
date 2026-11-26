import { TIERS } from '@/lib/curriculum/schema';
import { ConceptPage } from './concept-page';

/** Pre-renders each pillar's concept card so the app also works as a static export. */
export function generateStaticParams() {
  return TIERS.map((tier) => ({ tier: String(tier) }));
}

export const dynamicParams = false;

export default function Page() {
  return <ConceptPage />;
}
