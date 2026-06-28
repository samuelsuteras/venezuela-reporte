"use client";

import { REPORT_TYPE_ORDER, REPORT_TYPES } from "@/lib/report-types";
import { useT } from "@/lib/i18n/client";
import type { ReportType } from "@/lib/types";

/**
 * The big 4-color type picker. Native radios (visually hidden) wrapped in tile
 * labels → keyboard + screen-reader semantics for free. Each tile shows fill +
 * icon + label + description (DESIGN.md § Accessibility).
 */
export function ReportTypeSelector({
  value,
  onChange,
  error,
}: {
  value: ReportType | null;
  onChange: (type: ReportType) => void;
  error?: string;
}) {
  const t = useT();

  return (
    <fieldset>
      <legend className="text-h3">{t("report.typeQuestion")}</legend>
      <div
        className="mt-3 grid gap-3"
        role="radiogroup"
        aria-label={t("report.typeQuestion")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "type-error" : undefined}
      >
        {REPORT_TYPE_ORDER.map((key) => {
          const meta = REPORT_TYPES[key];
          const checked = value === key;
          return (
            <label
              key={key}
              className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border-2 p-3 peer-focus-visible:ring-2 ${
                checked ? "border-ink" : "border-hairline"
              }`}
            >
              <input
                type="radio"
                name="report-type"
                value={key}
                checked={checked}
                onChange={() => onChange(key)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`inline-flex size-12 shrink-0 items-center justify-center rounded-md text-h2 ${meta.fill} ${meta.on}`}
              >
                {meta.icon}
              </span>
              <span>
                <span className="block text-h3">{t(meta.labelKey)}</span>
                <span className="block text-body text-ink-soft">
                  {t(meta.descKey)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id="type-error" className="mt-1 text-caption text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
