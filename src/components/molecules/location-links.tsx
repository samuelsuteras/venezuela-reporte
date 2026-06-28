"use client";

import { useT } from "@/lib/i18n/client";

/**
 * "Get directions" buttons that open the coordinates in external map apps
 * (Google Maps, Waze). Plain links — they hand off to whatever the device has.
 */
export function LocationLinks({ lat, lng }: { lat: number; lng: number }) {
  const t = useT();
  const google = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const waze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const linkClass =
    "inline-flex min-h-11 items-center rounded-md border-[1.5px] border-hairline bg-canvas px-4 text-label";

  return (
    <div className="mt-4">
      <p className="text-label">{t("detail.directions")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={google} target="_blank" rel="noreferrer" className={linkClass}>
          🗺 {t("maps.google")}
        </a>
        <a href={waze} target="_blank" rel="noreferrer" className={linkClass}>
          🚗 {t("maps.waze")}
        </a>
      </div>
    </div>
  );
}
