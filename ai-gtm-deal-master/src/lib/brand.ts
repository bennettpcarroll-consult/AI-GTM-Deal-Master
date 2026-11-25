/** Non-pillar brand tokens. Pillar accents come from the rubric JSON. */
export const BRAND = {
  ink: '#111827',
  muted: '#64748B',
  canvas: '#F8FAFC',
  hairline: '#E5E7EB',
  emerald: '#10B981',
  emeraldText: '#047857',
  emeraldTint: '#ECFDF5',
  red: '#EF4444',
  redTint: '#FEF2F2'
} as const;

export const PILLAR_TINT: Record<1 | 2 | 3 | 4, string> = {
  1: '#FFF7ED',
  2: '#EFF6FF',
  3: '#F5F3FF',
  4: '#F0FDFA'
};
