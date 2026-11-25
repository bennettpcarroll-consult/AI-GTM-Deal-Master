export const STORAGE_KEY = 'deal-master:v1';
export const CHANGE_EVENT = 'deal-master:change';
export const CREDIT_THRESHOLD = 85;
export const DRILL_IDS = ['d1', 'd2', 'd3'] as const;
export const STAGES = ['LAGGING', 'EXPERIMENTING', 'PILOT PURGATORY', 'IN PRODUCTION', 'PROFIT'] as const;

export type Stage = (typeof STAGES)[number];
