"use client";

import Link from "next/link";
import { TypePin } from "@/components/atoms/type-pin";
import { REPORT_TYPES } from "@/lib/report-types";
import { formatRelative } from "@/lib/format";
import { reportImageUrl, type PublicReport } from "@/lib/feed";
import { useSaveData } from "@/lib/use-save-data";
import { useLocale, useT } from "@/lib/i18n/client";

/**
 * A public report in the discovery feed. Links to its detail page. The
 * thumbnail is dropped on data-saver/slow connections (DESIGN.md § Low-Bandwidth).
 */
export function PublicReportCard({ report }: { report: PublicReport }) {
  const t = useT();
  const locale = useLocale();
  const meta = REPORT_TYPES[report.type];
  const saveData = useSaveData();
  const thumb =
    !saveData && report.imagePaths[0]
      ? reportImageUrl(report.imagePaths[0])
      : null;

  return (
    <Link
      href={`/reportes/${report.id}`}
      className={`flex gap-3 rounded-lg border border-hairline-soft border-l-4 bg-canvas p-4 ${meta.accent}`}
    >
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element -- remote Supabase asset; next/image domain config deferred
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="size-16 shrink-0 rounded-md object-cover"
        />
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <TypePin type={report.type} />
          <span className={`text-label ${meta.text}`}>{t(meta.labelKey)}</span>
          {report.status === "resolved" && (
            <span className="rounded-pill bg-surface px-2 py-0.5 text-caption text-status-synced">
              {t("detail.resolved")}
            </span>
          )}
        </div>
        <h3 className="mt-1 text-h3">{report.title}</h3>
        {report.description && (
          <p className="mt-0.5 line-clamp-2 text-body text-ink-soft">
            {report.description}
          </p>
        )}
        <div className="mt-1 text-caption text-ink-muted">
          {formatRelative(new Date(report.createdAt).getTime(), locale)}
          {report.addressText ? ` · ${report.addressText}` : ""}
        </div>
      </div>
    </Link>
  );
}
