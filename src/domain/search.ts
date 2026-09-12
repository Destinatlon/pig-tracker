/**
 * Free-text matching for the product, variant and recipe lists.
 *
 * A query is matched word by word rather than as one phrase, so the words can be typed in any
 * order: `protein bar` finds both "protein bar" and "bar protein". Every term must appear
 * somewhere in the searched text, so more words narrow the results.
 *
 * Matching lives here rather than in SQL because SQLite's LIKE only folds ASCII case: it would
 * match "капуста" inside "Квашена капуста" but miss "Капуста білокачанна", which is exactly the
 * kind of near-miss that makes a search feel broken.
 */

/** More terms than this cannot usefully narrow a food name. */
const MAX_TERMS = 8;

export function searchTerms(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed === '') return [];
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .slice(0, MAX_TERMS);
}

/** True when every term appears in at least one of the fields. Empty/unknown fields are skipped. */
export function matchesTerms(terms: readonly string[], fields: readonly (string | null | undefined)[]): boolean {
  if (terms.length === 0) return true;
  const haystacks = fields.filter((field): field is string => !!field).map((field) => field.toLowerCase());
  if (haystacks.length === 0) return false;
  return terms.every((term) => haystacks.some((haystack) => haystack.includes(term)));
}

/** Convenience wrapper for a raw query; prefer `searchTerms` once per list, not once per row. */
export function matchesQuery(query: string, fields: readonly (string | null | undefined)[]): boolean {
  return matchesTerms(searchTerms(query), fields);
}

/** Keeps the items whose fields match every term of the query, preserving the given order. */
export function filterBySearch<T>(items: readonly T[], query: string, fields: (item: T) => (string | null | undefined)[]): T[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [...items];
  return items.filter((item) => matchesTerms(terms, fields(item)));
}
