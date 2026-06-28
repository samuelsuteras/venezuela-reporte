"use client";

import { REPORT_TYPES } from "@/lib/report-types";
import { useT } from "@/lib/i18n/client";
import type { ReportType } from "@/lib/types";

/**
 * The colored report-type pin: fill + icon + a screen-reader label. Color is
 * never the only signal — the glyph and the localized sr-only label both carry
 * the meaning. A client island, so its label is locale-correct even when
 * rendered inside a server page (DESIGN.md § Accessibility).
 */
export function TypePin({
  type,
  className = "",
}: {
  type: ReportType;
  className?: string;
}) {
  const t = useT();
  const meta = REPORT_TYPES[type];
  return (
    <span
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-label ${meta.fill} ${meta.on} ${className}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span className="sr-only">{t(meta.labelKey)}</span>
    </span>
  );
}
