"use client";

import Link from "next/link";
import { TypePin } from "@/components/atoms/type-pin";
import { REPORT_TYPES } from "@/lib/report-types";
import { formatRelative } from "@/lib/format";
import { reportImageUrl, type PublicReport } from "@/lib/feed";
import { useSaveData } from "@/lib/use-save-data";
import { useLocale, useT } from "@/lib/i18n/client";

/**
 * A public report in the discovery feed. Every card — local or hub — links to
 * its local detail page (`/reportes/{id}`). Hub reports resolve there via a hub
 * fallback fetch; the detail view shows their external source link. Hub cards
 * still carry a "Hub" badge so the origin stays visible.
 *
 * The thumbnail is dropped on data-saver/slow connections (DESIGN.md § Low-Bandwidth).
 *
 * @server-component No — owns no state; but uses hooks from use-client parents.
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

  const isHub = report.source === "hub";

  const inner = (
    <>
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element -- remote Supabase asset; next/image domain config deferred
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="size-16 shrink-0 rounded-md object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <TypePin type={report.type} />
          <span className={`text-label ${meta.text}`}>{t(meta.labelKey)}</span>
          {isHub && (
            <span className="rounded-pill bg-surface px-2 py-0.5 text-caption text-ink-muted border border-hairline">
              {t("feed.hubBadge")}
            </span>
          )}
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
    </>
  );

  const baseClass = `flex gap-3 rounded-lg border border-hairline-soft border-l-4 bg-canvas p-4 ${meta.accent}`;

  // All reports link to the local detail page; hub ids resolve via a hub
  // fallback fetch in the detail view.
  return (
    <Link href={`/reportes/${report.id}`} className={baseClass}>
      {inner}
    </Link>
  );
}
