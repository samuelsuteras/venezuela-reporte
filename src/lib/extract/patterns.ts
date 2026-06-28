/**
 * Deterministic, isomorphic (browser + node) extractors for the rigidly-formatted
 * entities. Run for free with no LLM and even offline; the fuzzy bits
 * (names/addresses) are the LLM's job (see llm.ts). All return normalized,
 * de-duplicated arrays.
 */

// Cédula / RIF: optional prefix V/E/J/P/G, optional separators, 6–9 digits.
const CEDULA_RE = /\b([VEJPGvejpg])[-\s.]?(\d{1,2}(?:[.\s]?\d{3}){1,2}|\d{6,9})\b/g;

/** Extract Venezuelan cédula/RIF numbers, normalized to `PREFIX-DIGITS`. */
export function extractCedulas(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(CEDULA_RE)) {
    const digits = m[2].replace(/[.\s]/g, "");
    if (digits.length >= 6 && digits.length <= 9) out.add(`${m[1].toUpperCase()}-${digits}`);
  }
  return [...out];
}

// VE phone: optional +58, mobile (0)4{12,14,16,24,26} or landline (0)2xx, then 3+4 digits.
const PHONE_RE = /(?:\+?58[\s-]?)?\(?0?(?:4(?:12|14|16|24|26)|2\d{2})\)?[\s-]?\d{3}[\s-]?\d{4}/g;

/** Extract VE phone numbers, normalized to `+58XXXXXXXXXX`. */
export function extractPhones(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(PHONE_RE)) {
    let n = m[0].replace(/\D/g, "");
    if (n.startsWith("58")) n = n.slice(2);
    if (n.startsWith("0")) n = n.slice(1);
    if (n.length === 10) out.add(`+58${n}`);
  }
  return [...out];
}

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi;

/** Extract absolute URLs (bare `www.` gets `https://`); invalid URLs dropped. */
export function extractLinks(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(URL_RE)) {
    let raw = m[0].replace(/[.,;:!?)]+$/, "");
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    try { out.add(new URL(raw).toString()); } catch { /* skip invalid */ }
  }
  return [...out];
}
