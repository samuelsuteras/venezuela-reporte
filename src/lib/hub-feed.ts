/**
 * Client for the venezuela-ayuda national hub public API.
 *
 * The hub aggregates crisis reports from multiple partner organizations.
 * Its GET endpoint is fully open (no API key) and CORS-enabled for browser
 * reads. Failures are swallowed silently so a hub outage never breaks the
 * local feed or map.
 *
 * Hub API reference: https://terremoto.hazlohoy.org/docs
 * OpenAPI contract:  https://terremoto.hazlohoy.org/openapi.yaml
 *
 * Type mapping — hub type → our 4-color taxonomy:
 *   missing_person            → emergency
 *   damaged_building          → emergency
 *   help_request (HIGH/CRIT)  → emergency
 *   help_request (LOW/MED)    → need
 *   checkin                   → info
 *   help_offer                → info
 */

import type { ReportType } from "./types";
import type { PublicReport } from "./feed";

/** Base URL for the hub. Override via env for staging/self-hosted instances. */
const HUB_BASE =
  process.env.NEXT_PUBLIC_HUB_API_URL ?? "https://terremoto.hazlohoy.org";

const HUB_TYPES = [
  "missing_person",
  "checkin",
  "help_request",
  "help_offer",
  "damaged_building",
] as const;

type HubType = (typeof HUB_TYPES)[number];

/**
 * Raw fields returned by GET /api/v1/reports for any hub type.
 * Fields vary by type; unknown extras are discarded.
 */
interface HubRow {
  id: string;
  created_at: string;
  name?: string | null;
  message?: string | null;
  description?: string | null;
  category?: string | null;
  urgency?: string | null;
  severity?: string | null;
  status?: string | null;
  place_name?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photo_url?: string | null;
  source_url?: string | null;
}

/** Maps a hub type + optional urgency to our local ReportType. */
function mapType(hubType: HubType, urgency?: string | null): ReportType {
  switch (hubType) {
    case "missing_person":
    case "damaged_building":
      return "emergency";
    case "help_request":
      return urgency === "CRITICAL" || urgency === "HIGH" ? "emergency" : "need";
    case "checkin":
    case "help_offer":
      return "info";
  }
}

/**
 * Synthesize a short, human-readable title from whichever fields the hub
 * type provides. The hub has no universal "title" column — each type stores
 * its primary descriptor differently.
 */
function buildTitle(hubType: HubType, r: HubRow): string {
  switch (hubType) {
    case "missing_person":
      return r.name ? `Se busca: ${r.name}` : "Persona desaparecida";
    case "checkin":
      return r.name ? `Check-in: ${r.name}` : "Check-in";
    case "help_request":
      return (
        r.description?.slice(0, 80) ?? r.category ?? "Solicitud de ayuda"
      );
    case "help_offer":
      return r.description?.slice(0, 80) ?? r.category ?? "Oferta de ayuda";
    case "damaged_building":
      return (
        r.place_name ?? r.description?.slice(0, 80) ?? "Edificio dañado"
      );
  }
}

/** Convert a hub API row to our local PublicReport shape. */
function toPublicReport(hubType: HubType, r: HubRow): PublicReport {
  return {
    id: r.id,
    type: mapType(hubType, r.urgency),
    title: buildTitle(hubType, r),
    description: r.description ?? r.message ?? null,
    lat: typeof r.latitude === "number" ? r.latitude : null,
    lng: typeof r.longitude === "number" ? r.longitude : null,
    addressText: r.city ?? r.place_name ?? null,
    status: "published",
    imagePaths: [],
    createdAt: r.created_at,
    contactPhone: null,
    extracted: null,
    source: "hub",
    sourceUrl: r.source_url ?? null,
  };
}

/**
 * Fetch one page of public reports from a single hub type.
 * Returns [] on any network or parse error.
 */
async function fetchOneHubType(
  hubType: HubType,
  limit: number,
): Promise<PublicReport[]> {
  try {
    const url = new URL("/api/v1/reports", HUB_BASE);
    url.searchParams.set("type", hubType);
    url.searchParams.set("limit", String(limit));

    // AbortSignal.timeout is available in all browsers supported since 2022.
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { reports?: HubRow[] };
    return (data.reports ?? []).map((r) => toPublicReport(hubType, r));
  } catch {
    // Hub down, timeout, or parse error — degrade gracefully.
    return [];
  }
}

/**
 * Fetch the latest public reports from the venezuela-ayuda hub for all five
 * hub types in parallel. A failure on any type returns [] for that type
 * without blocking the rest.
 *
 * This is safe to call from client components: the hub GET endpoint is
 * CORS-open and carries no PII (contact fields are server-private on the hub).
 *
 * @param limit - Max rows per hub type. Default 100 (map); use 20 for the feed.
 * @param withCoordsOnly - Drop rows with no coordinates (map use-case).
 */
export async function fetchHubReports(opts: {
  limit?: number;
  withCoordsOnly?: boolean;
} = {}): Promise<PublicReport[]> {
  const limit = opts.limit ?? 100;

  const perType = await Promise.all(
    HUB_TYPES.map((t) => fetchOneHubType(t, limit)),
  );
  const all = perType.flat();
  // Newest first — the per-type API returns each type's own ordering, so the
  // flattened list must be globally re-sorted. createdAt is ISO 8601, so a
  // string compare is a valid chronological compare.
  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return opts.withCoordsOnly
    ? all.filter((r) => r.lat !== null && r.lng !== null)
    : all;
}

/**
 * Resolve a single hub report by id for the detail view.
 *
 * The hub's GET /api/v1/reports/{id} endpoint omits which of the five hub types
 * the row is, but `toPublicReport` needs that to map title + color. So instead
 * of the by-id endpoint we refetch the recent pool (each type query knows its
 * own type) and find the match — guaranteeing the same shape the feed/map show.
 *
 * ponytail: scans the recent window; a report older than `limit` per type reads
 * as not-found. Switch to GET /api/v1/reports/{id} if its payload ever carries
 * the hub type, or if deep-linking stale hub reports becomes a need.
 */
export async function fetchHubReportById(
  id: string,
): Promise<PublicReport | null> {
  const all = await fetchHubReports({ limit: 100 });
  return all.find((r) => r.id === id) ?? null;
}
