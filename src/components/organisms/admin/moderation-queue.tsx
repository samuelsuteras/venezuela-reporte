"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchModerationReports,
  type ModReport,
  type ModStatus,
} from "@/lib/moderation";
import { ModerationRow } from "./moderation-row";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";

const TABS: { key: string; labelKey: MessageKey; statuses: ModStatus[] }[] = [
  { key: "flagged", labelKey: "admin.tab.flagged", statuses: ["flagged"] },
  { key: "published", labelKey: "admin.tab.published", statuses: ["published"] },
  { key: "resolved", labelKey: "admin.tab.resolved", statuses: ["resolved"] },
  { key: "hidden", labelKey: "admin.tab.hidden", statuses: ["removed", "merged"] },
];

/** Moderation queue: status tabs + a list of report rows with actions. */
export function ModerationQueue() {
  const t = useT();
  const [tab, setTab] = useState(0);
  const [reports, setReports] = useState<ModReport[] | null>(null);

  const load = useCallback(async () => {
    try {
      setReports(await fetchModerationReports(TABS[tab].statuses));
    } catch {
      setReports([]);
    }
  }, [tab]);

  useEffect(() => {
    // setState runs after the fetch resolves (async), not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div>
      <div role="tablist" aria-label="Estado" className="flex flex-wrap gap-2">
        {TABS.map((tabItem, i) => (
          <button
            key={tabItem.key}
            type="button"
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`min-h-11 rounded-pill border-[1.5px] px-3 text-label ${
              tab === i
                ? "border-ink bg-ink text-on-night"
                : "border-hairline bg-surface text-ink"
            }`}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {reports === null ? (
          <p className="text-body text-ink-soft">{t("common.loading")}</p>
        ) : reports.length === 0 ? (
          <p className="text-body text-ink-soft">{t("admin.empty")}</p>
        ) : (
          reports.map((r) => (
            <ModerationRow key={r.id} report={r} onChanged={load} />
          ))
        )}
      </div>
    </div>
  );
}
