/** Non-pillar brand tokens from the Profit, Not Pilots design system. Pillar accents come from the rubric JSON. */
export const BRAND = {
  ink: '#0e1116',
  slate: '#5e6672',
  deep: '#f4f5f7',
  hairline: 'rgb(14 20 34 / 0.09)',
  profit: '#0b9f6e',
  profitInk: '#08734f',
  profitSoft: '#ddf5ec',
  leak: '#f03e3e',
  leakInk: '#c92a2a',
  leakSoft: '#ffe6e6',
  people: '#c77dff',
  peopleInk: '#8a3cc7'
} as const;

/** Soft washes behind each pillar. */
export const PILLAR_TINT: Record<1 | 2 | 3 | 4, string> = {
  1: '#fff0e8',
  2: '#e8f2ff',
  3: '#f6ebff',
  4: '#e2f8f3'
};

/** Accent per skill family, using the pillar ink shades. */
export const FAMILY_COLOR: Record<string, string> = {
  fundamentals: '#1f6fd1',
  meddpicc: '#b85a24',
  consumption: '#8a3cc7',
  executive: '#12806b'
};
