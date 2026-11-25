import type { IconId } from '@/lib/curriculum/schema';

/** Thin-stroke line-art icons for the four units. */
export function UnitIcon({ name, className }: { name: IconId; className?: string }) {
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  switch (name) {
    case 'node-graph':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
          <circle cx="5" cy="6" r="2.5" />
          <circle cx="19" cy="6" r="2.5" />
          <circle cx="12" cy="18" r="2.5" />
          <path d="M7.2 7.2 10.5 16M16.8 7.2 13.5 16M7.5 6h9" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15.5 13.5c2.5.2 4.5 2.2 4.5 5.5" />
        </svg>
      );
    case 'layers':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="M3 12.5l9 5 9-5" />
          <path d="M3 17l9 5 9-5" />
        </svg>
      );
    case 'target':
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );
  }
}
