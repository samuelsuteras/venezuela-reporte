"use client";

import { useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { TypePin } from "@/components/atoms/type-pin";
import { BackButton } from "@/components/atoms/back-button";
import { StatusBadge } from "@/components/atoms/status-badge";
import { LocationLinks } from "@/components/molecules/location-links";
import { CallButton } from "@/components/molecules/call-button";
import { REPORT_TYPES } from "@/lib/report-types";
import { formatRelative } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";

/**
 * Detail of one of the user's own reports, read from the local outbox (Dexie)
 * by client UUID. Works whether or not the report has synced yet; shows its
 * images (from the stored blobs), sync status, location links, and a call
 * button for the contact phone they entered.
 */
export function MyReportDetailView({ id }: { id: string }) {
  const t = useT();
  const locale = useLocale();
  const report = useLiveQuery(() => db.outbox.get(id), [id], "loading" as const);

  const urls = useMemo(
    () =>
      report && report !== "loading"
        ? report.images.map((b) => URL.createObjectURL(b))
        : [],
    [report],
  );
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  if (report === "loading") {
    return <p className="text-body text-ink-soft">{t("common.loading")}</p>;
  }
  if (!report) {
    return (
      <>
        <BackButton />
        <p className="rounded-lg border border-hairline-soft bg-surface p-6 text-center text-body-lg">
          {t("detail.notFound")}
        </p>
      </>
    );
  }

  const meta = REPORT_TYPES[report.type];
  return (
    <article>
      <BackButton />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <TypePin type={report.type} />
          <span className={`text-label ${meta.text}`}>{t(meta.labelKey)}</span>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <h1 className="mt-2 text-h1">{report.title}</h1>
      <p className="mt-1 text-caption text-ink-muted">
        {formatRelative(report.createdAt, locale)}
        {report.addressText ? ` · ${report.addressText}` : ""}
      </p>
      {report.status === "error" && report.error && (
        <p className="mt-2 text-caption text-danger">{report.error}</p>
      )}

      {report.description && (
        <p className="mt-4 text-body-lg whitespace-pre-wrap">
          {report.description}
        </p>
      )}

      {urls.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {urls.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img
              key={u}
              src={u}
              alt={t("detail.photoAlt", { n: i + 1 })}
              className="aspect-square w-full rounded-md object-cover"
            />
          ))}
        </div>
      )}

      {report.lat != null && report.lng != null && (
        <>
          <p className="mt-4 text-body text-ink-soft">
            📍 {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
          </p>
          <LocationLinks lat={report.lat} lng={report.lng} />
        </>
      )}

      {report.contactPhone && <CallButton phone={report.contactPhone} />}
    </article>
  );
}
