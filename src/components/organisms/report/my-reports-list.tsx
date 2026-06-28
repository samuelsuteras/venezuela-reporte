"use client";

import Link from "next/link";
import { useMyReports } from "@/lib/reports";
import { ReportCard } from "@/components/molecules/report-card";
import { ReportCardBones } from "@/components/ui/loading-bones";
import { useT } from "@/lib/i18n/client";

/**
 * Live list of the user's locally-stored reports (reactive via Dexie). Shows
 * skeletons while the IndexedDB query resolves and an empty state with a
 * call-to-action when there are none.
 */
export function MyReportsList() {
  const t = useT();
  const reports = useMyReports();

  if (reports === undefined) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <ReportCardBones key={i} loading>
            <div />
          </ReportCardBones>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
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
  }

  return (
    <ul className="space-y-3">
      {reports.map((r) => (
        <li key={r.clientUuid}>
          <ReportCard report={r} />
        </li>
      ))}
    </ul>
  );
}
