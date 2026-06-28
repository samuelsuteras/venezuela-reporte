"use client";

import Link from "next/link";
import { useMyReports } from "@/lib/reports";
import { flushOutbox } from "@/lib/sync";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ReportCard } from "@/components/molecules/report-card";
import { ReportCardBones } from "@/components/ui/loading-bones";
import { useT } from "@/lib/i18n/client";

/**
 * Live list of the user's locally-stored reports (reactive via Dexie). Surfaces
 * why a report might be stuck: a "server not configured" notice and a manual
 * retry that re-runs the sync flush (watch the console for `[reporteve:sync]`).
 */
export function MyReportsList() {
  const t = useT();
  const reports = useMyReports();
  const hasUnsynced = (reports ?? []).some(
    (r) => r.status === "pending" || r.status === "error",
  );

  let content;
  if (reports === undefined) {
    content = (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <ReportCardBones key={i} loading>
            <div />
          </ReportCardBones>
        ))}
      </div>
    );
  } else if (reports.length === 0) {
    content = (
      <div className="rounded-lg border border-hairline-soft bg-surface p-6 text-center">
        <p className="text-body-lg">{t("mine.empty")}</p>
        <Link
          href="/reportar"
          className="mt-4 inline-flex min-h-12 items-center rounded-md bg-emergency px-5 text-button text-emergency-on"
        >
          {t("mine.create")}
        </Link>
      </div>
    );
  } else {
    content = (
      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.clientUuid}>
            <ReportCard report={r} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      {!isSupabaseConfigured && (
        <p className="mb-3 rounded-lg bg-surface p-4 text-body text-warning">
          {t("mine.notConfigured")}
        </p>
      )}
      {hasUnsynced && isSupabaseConfigured && (
        <button
          type="button"
          onClick={() => void flushOutbox()}
          className="mb-3 min-h-11 rounded-md border-[1.5px] border-hairline bg-canvas px-4 text-label"
        >
          {t("mine.retry")}
        </button>
      )}
      {content}
    </div>
  );
}
