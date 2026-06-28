import "server-only";
import { extractRegex } from "./patterns";
import { extractFuzzy } from "./llm";
import type { Extracted } from "./types";

/**
 * Full extraction: deterministic regex (cédula/phone/link) unioned with the
 * LLM's fuzzy names/addresses. Server-only (imports the AI pool). Degrades to
 * regex-only if the LLM pool is unconfigured or fails.
 *
 * @param text - Raw report/note text to extract entities from.
 * @returns Fully populated {@link Extracted} object; never throws.
 * @server-only — never call this from client components.
 */
export async function extractAll(text: string): Promise<Extracted> {
  const base = extractRegex(text);
  try {
    const fuzzy = await extractFuzzy(text);
    base.names = fuzzy.names;
    base.addresses = fuzzy.addresses;
  } catch {
    /* regex-only fallback */
  }
  return base;
}
