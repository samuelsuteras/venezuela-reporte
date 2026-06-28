/** Structured data pulled from a report/note's free text. */
export interface Extracted {
  cedulas: string[];
  phones: string[];
  links: string[];
  names: string[];
  addresses: string[];
}

/** A fresh all-empty Extracted. */
export function emptyExtracted(): Extracted {
  return { cedulas: [], phones: [], links: [], names: [], addresses: [] };
}

/**
 * Coerce a possibly-sloppy LLM array into clean strings: trim, drop empties and
 * non-strings, dedupe case-insensitively, cap length. Free models emit dupes,
 * whitespace, and wrong types — validate loose, normalize here (market-chat lesson).
 */
export function normalizeStrings(arr: unknown, cap = 20): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}
