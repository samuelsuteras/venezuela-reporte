import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { pickTier1 } from "@/lib/ai/router";
import { breaker } from "@/lib/ai/circuit-breaker";
import { normalizeStrings } from "./types";

// Permissive schema — validate loose, normalize after (free models are sloppy).
const fuzzySchema = z.object({
  names: z.array(z.string()).optional(),
  addresses: z.array(z.string()).optional(),
});

const prompt = (text: string) =>
  `Eres un extractor de datos para reportes de emergencia en Venezuela. ` +
  `Del siguiente texto, extrae SOLO: (1) nombres de personas mencionadas, ` +
  `(2) direcciones o ubicaciones (calles, sectores, barrios, puntos de referencia). ` +
  `No inventes datos que no estén en el texto. No incluyas cédulas ni teléfonos. ` +
  `Responde en JSON con las claves "names" y "addresses".\n\nTexto:\n"""${text}"""`;

/**
 * Pull person names + addresses via the rotated provider pool. Tries up to two
 * providers, recording breaker success/failure. Returns empty arrays when no
 * provider is configured or every attempt fails — the caller keeps regex results.
 *
 * @param text - Raw report/note text to extract entities from.
 * @returns `{ names, addresses }` — normalized, deduplicated arrays.
 * @server-only — never call this from client components.
 */
export async function extractFuzzy(text: string): Promise<{ names: string[]; addresses: string[] }> {
  if (!text.trim()) return { names: [], addresses: [] };
  for (let attempt = 0; attempt < 2; attempt++) {
    const pick = pickTier1();
    if (!pick) break;
    try {
      const { object } = await generateObject({ model: pick.model, schema: fuzzySchema, prompt: prompt(text) });
      breaker.recordSuccess(pick.key);
      return { names: normalizeStrings(object.names), addresses: normalizeStrings(object.addresses) };
    } catch {
      breaker.recordFailure(pick.key);
    }
  }
  return { names: [], addresses: [] };
}
