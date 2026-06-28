import { describe, it, expect, vi } from "vitest";

vi.mock("./llm", () => ({
  extractFuzzy: vi.fn(async () => ({ names: ["Ana Pérez"], addresses: ["Av. Bolívar"] })),
}));

import { extractAll } from "./extract";

describe("extractAll", () => {
  it("unions regex entities with LLM names/addresses", async () => {
    const r = await extractAll("Ana Pérez, V-12345678, 0414-1234567, https://wa.me/1 en Av. Bolívar");
    expect(r.cedulas).toEqual(["V-12345678"]);
    expect(r.phones).toEqual(["+584141234567"]);
    expect(r.links).toEqual(["https://wa.me/1"]);
    expect(r.names).toEqual(["Ana Pérez"]);
    expect(r.addresses).toEqual(["Av. Bolívar"]);
  });

  it("falls back to regex-only when the LLM throws", async () => {
    const llm = await import("./llm");
    vi.mocked(llm.extractFuzzy).mockRejectedValueOnce(new Error("all providers down"));
    const r = await extractAll("V-12345678");
    expect(r.cedulas).toEqual(["V-12345678"]);
    expect(r.names).toEqual([]);
  });
});
