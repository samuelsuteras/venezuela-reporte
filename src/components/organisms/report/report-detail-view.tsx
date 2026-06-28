"use client";

import { useEffect, useState } from "react";
import { TypePin } from "@/components/atoms/type-pin";
import { BackButton } from "@/components/atoms/back-button";
import { LocationLinks } from "@/components/molecules/location-links";
import { CallButton } from "@/components/molecules/call-button";
import { ImageGallery } from "@/components/molecules/image-gallery";
import { ReportActions } from "@/components/organisms/report/report-actions";
import { REPORT_TYPES } from "@/lib/report-types";
import { formatRelative } from "@/lib/format";
import { fetchReportById, reportImageUrl, type PublicReport } from "@/lib/feed";
import { useLocale, useT } from "@/lib/i18n/client";

/**
 * Report detail, fetched CLIENT-side — the same path the feed uses, so if a
 * report shows in the feed it also opens here (avoids the server/client env
 * asymmetry that made server-side fetch return "not found"). `undefined` =
 * loading, `null` = genuinely not found.
 */
export function ReportDetailView({ id }: { id: string }) {
  const t = useT();
  const locale = useLocale();
  const [report, setReport] = useState<PublicReport | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let active = true;
    fetchReportById(id)
      .then((r) => {
        if (active) setReport(r);
      })
      .catch(() => {
        if (active) setReport(null);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (report === undefined) {
    return <p className="text-body text-ink-soft">{t("common.loading")}</p>;
  }
  if (report === null) {
    return (
      <p className="rounded-lg border border-hairline-soft bg-surface p-6 text-center text-body-lg">
        {t("detail.notFound")}
      </p>
    );
  }

  const meta = REPORT_TYPES[report.type];
  return (
    <article>
      <BackButton />
      <div className="flex items-center gap-2">
        <TypePin type={report.type} />
        <span className={`text-label ${meta.text}`}>{t(meta.labelKey)}</span>
        {report.status === "resolved" && (
          <span className="rounded-pill bg-surface px-2 py-0.5 text-caption text-status-synced">
            {t("detail.resolved")}
          </span>
        )}
      </div>
      <h1 className="mt-2 text-h1">{report.title}</h1>
      <p className="mt-1 text-caption text-ink-muted">
        {formatRelative(new Date(report.createdAt).getTime(), locale)}
        {report.addressText ? ` · ${report.addressText}` : ""}
      </p>

      {report.description && (
        <p className="mt-4 text-body-lg whitespace-pre-wrap">
          {report.description}
        </p>
      )}

      {report.imagePaths.length > 0 && (
        <ImageGallery
          urls={report.imagePaths
            .map((p) => reportImageUrl(p))
            .filter((u): u is string => !!u)}
        />
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

      <ReportActions reportId={report.id} />
    </article>
  );
}
