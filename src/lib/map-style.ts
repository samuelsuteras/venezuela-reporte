import type { StyleSpecification } from "maplibre-gl";

// Type-only maplibre import above (erased at build) keeps this module safe to
// evaluate during SSR. The maplibre + pmtiles runtime is dynamically imported
// inside MapView's effect, browser-side only.

const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

/** True when a full vector basemap style (with glyphs) is configured. Cluster
 * count labels need glyphs, so we only add them when this is true. */
export const HAS_BASEMAP = Boolean(MAP_STYLE_URL);

/** Default view (Caracas-ish) before the user shares their location. */
export const DEFAULT_CENTER: [number, number] = [-66.9, 10.5];
export const DEFAULT_ZOOM = 5.2;

/**
 * Default basemap: CARTO Voyager raster tiles. No API key, globally reachable
 * (including Venezuela), so the map ALWAYS shows real context even with zero
 * configuration. For production scale / true offline, set
 * `NEXT_PUBLIC_MAP_STYLE_URL` to a vector style (e.g. self-hosted
 * Protomaps/PMTiles).
 */
const RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap, © CARTO",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#eef1f5" } },
    { id: "basemap", type: "raster", source: "basemap" },
  ],
};

/** A configured vector style URL, or the always-available raster fallback. A
 * `pmtiles://` source in a configured style works (MapView registers it). */
export function getMapStyle(): string | StyleSpecification {
  return MAP_STYLE_URL ?? RASTER_STYLE;
}
