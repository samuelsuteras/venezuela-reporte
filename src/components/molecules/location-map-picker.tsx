"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MlMap, Marker as MlMarker } from "maplibre-gl";
import { DEFAULT_CENTER, DEFAULT_ZOOM, getMapStyle } from "@/lib/map-style";
import { logError } from "@/lib/log";

/**
 * Tap-or-drag location picker. Shows a small MapLibre map with a draggable red
 * pin. Tapping the map moves the pin; both gestures report the new lat/lng via
 * `onPick`. Uses the default raster basemap (always loads). The pin starts at
 * the current value, or Caracas if none — but `onPick` only fires on a real
 * user gesture, so opening the map never silently sets a bogus location.
 */
export function LocationMapPicker({
  lat,
  lng,
  onPick,
}: {
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRef = useRef<MlMarker | null>(null);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Init once.
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

      const startLng = lng ?? DEFAULT_CENTER[0];
      const startLat = lat ?? DEFAULT_CENTER[1];
      map = new maplibregl.Map({
        container: el,
        style: getMapStyle(),
        center: [startLng, startLat],
        zoom: lat != null ? 14 : DEFAULT_ZOOM,
      });
      mapRef.current = map;
      map.on("error", (e) =>
        logError("mappick", e.error?.message ?? "unknown"),
      );
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.on("load", () => map?.resize());

      const marker = new maplibregl.Marker({ color: "#d32029", draggable: true })
        .setLngLat([startLng, startLat])
        .addTo(map);
      markerRef.current = marker;
      marker.on("dragend", () => {
        const p = marker.getLngLat();
        onPickRef.current(p.lat, p.lng);
      });
      map.on("click", (e) => {
        marker.setLngLat(e.lngLat);
        onPickRef.current(e.lngLat.lat, e.lngLat.lng);
      });
    })();

    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; coord changes handled below
  }, []);

  // Keep the pin in sync if coords change externally (e.g. the GPS button).
  useEffect(() => {
    if (lat != null && lng != null) markerRef.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Mapa para elegir ubicación"
      className="mt-2 h-64 w-full overflow-hidden rounded-lg border border-hairline"
    />
  );
}
