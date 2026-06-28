"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  GeoJSONSource,
  Map as MlMap,
  MapGeoJSONFeature,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { FilterBar } from "@/components/molecules/filter-bar";
import {
  fetchReports,
  subscribeReports,
  type PublicReport,
} from "@/lib/feed";
import { fetchHubReports } from "@/lib/hub-feed";
import { REPORT_TYPE_ORDER } from "@/lib/report-types";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  getMapStyle,
  HAS_BASEMAP,
} from "@/lib/map-style";
import { log, logError } from "@/lib/log";
import type { ReportType } from "@/lib/types";

const SOURCE_ID = "reports";

/**
 * Build a GeoJSON FeatureCollection from local + hub reports, filtered by the
 * active type set. Only reports with coordinates are included (enforced by both
 * fetch calls). The `source` property on each feature lets the click handler
 * distinguish hub markers (no local detail page) from local ones.
 */
function toFeatureCollection(
  reports: PublicReport[],
  types: Set<ReportType>,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: reports
      .filter((r) => r.lat != null && r.lng != null && types.has(r.type))
      .map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.lng!, r.lat!] },
        properties: {
          id: r.id,
          type: r.type,
          title: r.title,
          source: r.source ?? "local",
        },
      })),
  };
}

/**
 * Map of public reports. Clustered, color-coded by type. Built on MapLibre GL
 * (dynamically imported, browser-only). Basemap comes from a configured style
 * URL or a blank fallback (see map-style.ts).
 *
 * Reports come from two sources merged into one GeoJSON layer:
 *   - Local Supabase (real-time subscription)
 *   - Venezuela-ayuda national hub (polled once on mount; no real-time)
 *
 * Hub markers are displayed identically to local ones but clicking them does
 * NOT navigate to a local detail page (their UUIDs belong to the hub's DB).
 * The list/feed is the accessible equivalent — keyboard users reach reports
 * there (DESIGN.md § Accessibility).
 *
 * @client-component Owns map lifecycle, report refs, and filter state.
 */
export function MapView() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  // All reports (local + hub) merged. Updated by both load paths.
  const reportsRef = useRef<PublicReport[]>([]);
  // Separate refs for each source so we can merge without one overwriting the other.
  const localRef = useRef<PublicReport[]>([]);
  const hubRef = useRef<PublicReport[]>([]);
  const [selected, setSelected] = useState<Set<ReportType>>(
    new Set(REPORT_TYPE_ORDER),
  );
  const selectedRef = useRef(selected);

  /** Merge local + hub into reportsRef and push to the map source. */
  const applyData = useCallback(() => {
    reportsRef.current = [...localRef.current, ...hubRef.current];
    const source = mapRef.current?.getSource(SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    source?.setData(
      toFeatureCollection(reportsRef.current, selectedRef.current),
    );
  }, []);

  // Init the map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let map: MlMap | undefined;
    let disposed = false;

    void (async () => {
      const [{ default: maplibregl }, { Protocol }] = await Promise.all([
        import("maplibre-gl"),
        import("pmtiles"),
      ]);
      if (disposed) return;
      maplibregl.addProtocol("pmtiles", new Protocol().tile);
      log("map", "init", { hasBasemap: HAS_BASEMAP });

      map = new maplibregl.Map({
        container: el,
        style: getMapStyle(),
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });
      mapRef.current = map;
      map.on("error", (e) =>
        logError("map", e.error?.message ?? String(e.error ?? "unknown")),
      );
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }),
        "top-right",
      );

      map.on("load", () => {
        if (!map) return;
        log("map", "loaded");
        map.resize(); // guard against a 0-height first layout
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: toFeatureCollection([], selectedRef.current),
          cluster: true,
          clusterRadius: 50,
          clusterMaxZoom: 14,
        });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#0f1722",
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 30],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
        if (HAS_BASEMAP) {
          map.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: SOURCE_ID,
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
            },
            paint: { "text-color": "#ffffff" },
          });
        }
        map.addLayer({
          id: "points",
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "type"],
              "emergency",
              "#d32029",
              "need",
              "#f59e0b",
              "info",
              "#1d4ed8",
              "resolved",
              "#64748b",
              "pet",
              "#7c3aed",
              "#64748b",
            ],
            "circle-radius": 8,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        applyData();

        map.on("click", "clusters", (e) => {
          if (!map) return;
          const feature = map.queryRenderedFeatures(e.point, {
            layers: ["clusters"],
          })[0] as MapGeoJSONFeature | undefined;
          const clusterId = feature?.properties?.cluster_id as number | undefined;
          if (clusterId == null) return;
          const source = map.getSource(SOURCE_ID) as GeoJSONSource;
          void source.getClusterExpansionZoom(clusterId).then((zoom) => {
            map?.easeTo({
              center: (feature!.geometry as Point).coordinates as [
                number,
                number,
              ],
              zoom,
            });
          });
        });

        map.on("click", "points", (e) => {
          const props = e.features?.[0]?.properties;
          const id = props?.id as string | undefined;
          const reportSource = props?.source as string | undefined;
          // Hub report UUIDs belong to the hub's database — navigating to a
          // local detail page would 404. Skip navigation for hub markers.
          if (id && reportSource !== "hub") router.push(`/reportes/${id}`);
        });

        for (const layer of ["clusters", "points"]) {
          map.on("mouseenter", layer, () => {
            if (map) map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            if (map) map.getCanvas().style.cursor = "";
          });
        }
      });
    })();

    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [router, applyData]);

  // Load local report data + subscribe to realtime changes.
  useEffect(() => {
    let active = true;
    const load = () =>
      fetchReports({ withCoordsOnly: true, limit: 500 })
        .then((reports) => {
          if (!active) return;
          localRef.current = reports;
          applyData();
        })
        .catch(() => {});
    void load();
    const unsubscribe = subscribeReports(() => void load());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyData]);

  // Load hub reports once on mount (hub has no realtime channel).
  // Hub fetch runs independently so a hub outage never affects local markers.
  useEffect(() => {
    let active = true;
    void fetchHubReports({ withCoordsOnly: true, limit: 200 }).then(
      (reports) => {
        if (!active) return;
        hubRef.current = reports;
        applyData();
        log("map", `hub: ${reports.length} markers loaded`);
      },
    );
    return () => {
      active = false;
    };
  }, [applyData]);

  // Keep the ref current (in an effect, not during render) and re-filter when
  // the user toggles types.
  useEffect(() => {
    selectedRef.current = selected;
    applyData();
  }, [selected, applyData]);

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 z-10 bg-canvas/90 p-2 backdrop-blur">
        <FilterBar value={selected} onChange={setSelected} />
      </div>
      <div
        ref={containerRef}
        className="h-[calc(100dvh-7.5rem)] w-full"
        aria-label="Mapa de reportes"
        role="application"
      />
    </div>
  );
}
