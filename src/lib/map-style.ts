import type { StyleSpecification } from "maplibre-gl";

// Type-only maplibre import above (erased at build) keeps this module safe to
// evaluate during SSR. The maplibre + pmtiles runtime is dynamically imported
// inside MapView's effect, browser-side only.

const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

/** True when a real basemap style (with glyphs) is configured. Cluster count
 * labels need glyphs, so we only add them when this is true. */
export const HAS_BASEMAP = Boolean(MAP_STYLE_URL);

/** Default view (Caracas-ish) before the user shares their location. */
export const DEFAULT_CENTER: [number, number] = [-66.9, 10.5];
export const DEFAULT_ZOOM = 5.2;

/** Flat fallback style — no basemap, but our colored markers still render.
 * Per DESIGN.md the list view is the accessible equivalent of the map. */
export const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#eef1f5" },
    },
  ],
};

/**
 * The map style: a configured basemap URL (set `NEXT_PUBLIC_MAP_STYLE_URL` to a
 * full MapLibre style — e.g. a self-hosted Protomaps/PMTiles style for offline
 * use), or the blank fallback. A `pmtiles://` source inside that style works
 * because MapView registers the protocol.
 */
export function getMapStyle(): string | StyleSpecification {
  return MAP_STYLE_URL ?? BLANK_STYLE;
}
