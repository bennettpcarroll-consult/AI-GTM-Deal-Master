import { redirect } from 'next/navigation';

/** The dashboard became the path. Old links still land in the right place. */
export default function DashboardPage() {
  redirect('/path');
}
