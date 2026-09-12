/**
 * Escapes regex metacharacters in user-supplied search input.
 *
 * This is mandatory, not defensive paranoia: an unescaped "(" in a search
 * query throws inside MongoDB and surfaces as a 500, and a crafted pattern
 * like "(a+)+$" against a large-enough field is a ReDoS vector. Every
 * `$regex` built from request input MUST go through this first.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
