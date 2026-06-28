"use client";

import { useState } from "react";
import { flagReport, FLAG_REASONS, type FlagReason } from "@/lib/moderation";
import { useT } from "@/lib/i18n/client";

/**
 * Public "flag this report" control on the detail page. Anonymous; one flag per
 * browser. Enough distinct flags auto-hides a report for moderator review
 * (reactive moderation — there's no pre-approval gate).
 */
export function ReportActions({ reportId }: { reportId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function flag(reason: FlagReason) {
    setBusy(true);
    setError(undefined);
    try {
      await flagReport(reportId, reason);
      setDone(true);
      setOpen(false);
    } catch {
      setError(t("detail.flagError"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="mt-6 border-t border-hairline-soft pt-4 text-caption text-ink-muted">
        {t("detail.flagThanks")}
      </p>
    );
  }

  return (
    <div className="mt-6 border-t border-hairline-soft pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-11 text-label text-ink-muted underline"
        >
          {t("detail.flag")}
        </button>
      ) : (
        <div>
          <p className="text-label">{t("detail.flagQuestion")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FLAG_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                disabled={busy}
                onClick={() => flag(r.value)}
                className="min-h-11 rounded-pill border-[1.5px] border-hairline bg-surface px-3 text-label disabled:opacity-60"
              >
                {t(r.labelKey)}
              </button>
            ))}
          </div>
          {error && (
            <p className="mt-2 text-caption text-danger" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 min-h-11 text-caption text-ink-muted underline"
          >
            {t("common.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
