import { getAdminSupabase } from "@/lib/supabase-admin";
import { extractAll } from "@/lib/extract/extract";

export const runtime = "nodejs";

type Body = { kind?: "report" | "note"; clientUuid?: string };

// ponytail: process-local IP rate limit; per cold start is fine at our scale.
const hits = new Map<string, number[]>();
function rateLimited(ip: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const a = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  a.push(now);
  hits.set(ip, a);
  return a.length > max;
}

/**
 * Extract structured data from a report/note and persist it. Triggered
 * fire-and-forget after a report syncs or a note is posted (the client can't
 * call the LLM — keys are server-only). Idempotent: skips rows already
 * extracted unless `?force=1`. No-op when Supabase isn't configured.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.clientUuid || (body.kind !== "report" && body.kind !== "note")) {
    return new Response("bad request", { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return new Response("rate limited", { status: 429 });

  const admin = getAdminSupabase();
  if (!admin) return new Response(null, { status: 204 }); // unconfigured — nothing to do

  const table = body.kind === "report" ? "reports" : "report_notes";
  const textCol = body.kind === "report" ? "description" : "body";
  const force = new URL(req.url).searchParams.get("force") === "1";

  const { data, error } = await admin
    .from(table)
    .select(`${textCol},extracted_at`)
    .eq("client_uuid", body.clientUuid)
    .maybeSingle();
  if (error || !data) return new Response("not found", { status: 404 });

  const row = data as Record<string, unknown>;
  if (row.extracted_at && !force) return new Response(null, { status: 204 });

  const extracted = await extractAll((row[textCol] as string | null) ?? "");
  const { error: upErr } = await admin
    .from(table)
    .update({ extracted, extracted_at: new Date().toISOString() })
    .eq("client_uuid", body.clientUuid);
  if (upErr) return new Response("write failed", { status: 500 });

  return Response.json({ ok: true, extracted });
}
