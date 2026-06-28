import { describe, it, expect, vi, beforeEach } from "vitest";

const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
const single = vi.fn();
const from = vi.fn(() => ({
  select: () => ({ eq: () => ({ maybeSingle: single }) }),
  update,
}));
vi.mock("@/lib/supabase-admin", () => ({ getAdminSupabase: () => ({ from }) }));
vi.mock("@/lib/extract/extract", () => ({
  extractAll: vi.fn(async () => ({ cedulas: ["V-1"], phones: [], links: [], names: [], addresses: [] })),
}));

import { POST } from "./route";

function req(body: unknown, url = "http://x/api/extract") {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" }, body: JSON.stringify(body) }) as never;
}

describe("POST /api/extract", () => {
  beforeEach(() => { single.mockReset(); update.mockClear(); });

  it("400 on bad body", async () => {
    const res = await POST(req({ kind: "x" }));
    expect(res.status).toBe(400);
  });

  it("extracts and writes back", async () => {
    single.mockResolvedValueOnce({ data: { description: "Ana V-1", extracted_at: null }, error: null });
    const res = await POST(req({ kind: "report", clientUuid: "u1" }));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledOnce();
  });

  it("is idempotent (204, no write) when already extracted and not forced", async () => {
    single.mockResolvedValueOnce({ data: { description: "x", extracted_at: "2026-01-01" }, error: null });
    const res = await POST(req({ kind: "report", clientUuid: "u1" }));
    expect(res.status).toBe(204);
    expect(update).not.toHaveBeenCalled();
  });

  it("404 when the row is missing", async () => {
    single.mockResolvedValueOnce({ data: null, error: null });
    const res = await POST(req({ kind: "note", clientUuid: "nope" }));
    expect(res.status).toBe(404);
  });
});
