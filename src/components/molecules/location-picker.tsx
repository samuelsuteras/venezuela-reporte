"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { TextField } from "./text-field";
import { useT } from "@/lib/i18n/client";

export interface LocationValue {
  lat?: number;
  lng?: number;
  addressText?: string;
}

/**
 * Location capture for Phase 1: one-tap GPS plus a free-text address/reference.
 * Both optional — a report with no location is still valid. Drag-a-pin-on-map
 * selection arrives in Phase 2 with MapView (PLAN.md § 5). Geolocation errors
 * are shown but never block submission.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}) {
  const t = useT();
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string>();
  const hasCoords = value.lat != null && value.lng != null;

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoError(t("report.geoUnsupported"));
      return;
    }
    setLocating(true);
    setGeoError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          ...value,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setGeoError(t("report.geoFail"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div>
      <span className="text-label">{t("report.locationLabel")}</span>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={useMyLocation}
          disabled={locating}
          aria-busy={locating}
        >
          📍 {locating ? t("report.locating") : t("report.useLocation")}
        </Button>
        {hasCoords && (
          <span className="inline-flex items-center gap-2 text-caption text-ink-soft">
            <span aria-hidden="true">✓</span>
            {value.lat!.toFixed(4)}, {value.lng!.toFixed(4)}
            <button
              type="button"
              onClick={() => onChange({ ...value, lat: undefined, lng: undefined })}
              className="text-info-text underline"
            >
              {t("report.removeLocation")}
            </button>
          </span>
        )}
      </div>

      {geoError && (
        <p className="mt-1 text-caption text-danger" role="alert">
          {geoError}
        </p>
      )}

      <div className="mt-3">
        <TextField
          id="address"
          label={t("report.addressLabel")}
          value={value.addressText ?? ""}
          onChange={(v) => onChange({ ...value, addressText: v })}
          placeholder={t("report.addressPlaceholder")}
          autoComplete="off"
          maxLength={200}
        />
      </div>
    </div>
  );
}
