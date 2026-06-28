"use client";

import { TypePin } from "@/components/atoms/type-pin";
import { StatusBadge } from "@/components/atoms/status-badge";
import { REPORT_TYPES } from "@/lib/report-types";
import { formatRelative } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { OutboxReport } from "@/lib/types";

/**
 * One report in the "Mis reportes" list. Color accent bar + pin + label + sync
 * badge. Images show as a count (local blobs — no network).
 */
export function ReportCard({ report }: { report: OutboxReport }) {
  const t = useT();
  const locale = useLocale();
  const meta = REPORT_TYPES[report.type];
  return (
    <article
      className={`rounded-lg border border-hairline-soft border-l-4 bg-canvas p-4 ${meta.accent}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <TypePin type={report.type} />
          <span className={`text-label ${meta.text}`}>{t(meta.labelKey)}</span>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <h3 className="mt-2 text-h3">{report.title}</h3>
      {report.description && (
        <p className="mt-1 line-clamp-2 text-body text-ink-soft">
          {report.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-muted">
        <span>{formatRelative(report.createdAt, locale)}</span>
        {report.addressText && <span>· {report.addressText}</span>}
        {report.lat != null && <span>· 📍</span>}
        {report.images.length > 0 && <span>· 📷 {report.images.length}</span>}
      </div>

      {report.status === "error" && report.error && (
        <p className="mt-2 text-caption text-danger">{report.error}</p>
      )}
    </article>
  );
}
