import "server-only";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/** Free-tier providers we rotate over. */
export type ProviderKey = "groq" | "cerebras" | "gemini" | "openrouter";

const keys: Record<ProviderKey, string | undefined> = {
  groq: process.env.GROQ_API_KEY,
  cerebras: process.env.CEREBRAS_API_KEY,
  gemini: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};

const lazy = <T>(fn: () => T) => { let v: T | null = null; return () => (v ??= fn()); };

const groq = lazy(() => createGroq({ apiKey: keys.groq ?? "missing" }));
const cerebras = lazy(() => createOpenAICompatible({ name: "cerebras", baseURL: "https://api.cerebras.ai/v1", apiKey: keys.cerebras ?? "missing" }));
const google = lazy(() => createGoogleGenerativeAI({ apiKey: keys.gemini ?? "missing" }));
const openrouter = lazy(() => createOpenAICompatible({ name: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey: keys.openrouter ?? "missing" }));

const models: Record<ProviderKey, () => LanguageModel> = {
  groq: lazy(() => groq()(process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile")),
  cerebras: lazy(() => cerebras()(process.env.CEREBRAS_MODEL ?? "llama-3.3-70b") as LanguageModel),
  gemini: lazy(() => google()(process.env.GEMINI_MODEL ?? "gemini-2.5-flash")),
  openrouter: lazy(() => openrouter()(process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free") as LanguageModel),
};

/**
 * Construct (lazily, cached) the LanguageModel for a provider.
 * @param key - The provider identifier.
 * @returns A Vercel AI SDK {@link LanguageModel} instance.
 */
export function getModel(key: ProviderKey): LanguageModel { return models[key](); }

/**
 * Rotation order — only providers whose API key is actually set.
 * Providers with no key are excluded at startup so they never receive traffic.
 */
export const TIER_1_ORDER: ProviderKey[] =
  (["groq", "gemini", "openrouter", "cerebras"] as ProviderKey[]).filter((k) => Boolean(keys[k]));

/**
 * True when at least one provider key is configured.
 * Server components can gate AI features behind this check to
 * gracefully degrade when no keys are present.
 */
export function hasAnyProvider(): boolean { return TIER_1_ORDER.length > 0; }
