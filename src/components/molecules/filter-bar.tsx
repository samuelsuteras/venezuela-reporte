"use client";

import { REPORT_TYPE_ORDER, REPORT_TYPES } from "@/lib/report-types";
import { useT } from "@/lib/i18n/client";
import type { ReportType } from "@/lib/types";

/**
 * Toggleable type filter pills (shared by feed + map). Real toggle buttons with
 * `aria-pressed`; selected pills fill with the type color + icon + label. An
 * empty selection is allowed (shows nothing).
 */
export function FilterBar({
  value,
  onChange,
}: {
  value: Set<ReportType>;
  onChange: (next: Set<ReportType>) => void;
}) {
  const t = useT();

  function toggle(type: ReportType) {
    const next = new Set(value);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange(next);
  }

  return (
    <div role="group" aria-label={t("filter.label")} className="flex flex-wrap gap-2">
      {REPORT_TYPE_ORDER.map((key) => {
        const meta = REPORT_TYPES[key];
        const on = value.has(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(key)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill border-[1.5px] px-3 text-label ${
              on
                ? `border-transparent ${meta.fill} ${meta.on}`
                : "border-hairline bg-surface text-ink"
            }`}
          >
            <span aria-hidden="true">{meta.icon}</span>
            {t(meta.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
