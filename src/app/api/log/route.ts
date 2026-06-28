import type { NextRequest } from "next/server";

interface ClientLog {
  level?: "log" | "error";
  scope?: string;
  args?: unknown[];
  ua?: string;
  online?: boolean | null;
}

/**
 * Sink for client-side logs so browser-side sync errors land in Vercel function
 * logs. Fire-and-forget from the client; always returns 204. Not for sensitive
 * data — only operational breadcrumbs.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = (await req.json()) as ClientLog;
    const line = `[client] ${body.scope ?? "?"} ${JSON.stringify(
      body.args ?? [],
    )} ua=${body.ua ?? ""} online=${body.online ?? ""}`;
    if (body.level === "error") console.error(line);
    else console.log(line);
  } catch {
    // ignore malformed payloads
  }
  return new Response(null, { status: 204 });
}
