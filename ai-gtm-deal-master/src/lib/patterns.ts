export function matchesAny(patterns: readonly string[], text: string): boolean {
  return patterns.some((pattern) => new RegExp(pattern, 'i').test(text));
}

/** Indices of the patterns that match, so the grader can tell two different probe shapes apart. */
export function matchingIndices(patterns: readonly string[], text: string): number[] {
  return patterns.flatMap((pattern, index) => (new RegExp(pattern, 'i').test(text) ? [index] : []));
}
