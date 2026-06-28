"use client";

import { useState, type ReactNode } from "react";
import { TypePin } from "@/components/atoms/type-pin";
import { REPORT_TYPES } from "@/lib/report-types";
import { formatRelative } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import {
  clearFlags,
  fetchDuplicates,
  mergeReport,
  removeReport,
  resolveReport,
  restoreReport,
  type ModReport,
} from "@/lib/moderation";

function ActButton({
  children,
  onClick,
  busy,
}: {
  children: ReactNode;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="min-h-11 rounded-md border-[1.5px] border-hairline bg-canvas px-3 text-label disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** One report in the moderation queue with its actions and a duplicate finder. */
export function ModerationRow({
  report,
  onChanged,
}: {
  report: ModReport;
  onChanged: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const meta = REPORT_TYPES[report.type];
  const [busy, setBusy] = useState(false);
  const [dups, setDups] = useState<ModReport[] | null>(null);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function findDuplicates() {
    setBusy(true);
    try {
      setDups(await fetchDuplicates(report.id));
    } finally {
      setBusy(false);
    }
  }

  const hidden = report.status === "removed" || report.status === "merged";

  return (
    <article
      className={`rounded-lg border border-hairline-soft border-l-4 bg-canvas p-4 ${meta.accent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <TypePin type={report.type} />
          <span className={`text-label ${meta.text}`}>{t(meta.labelKey)}</span>
        </div>
        <span className="text-caption text-ink-muted">
          {report.flagCount > 0 ? `🚩 ${report.flagCount} · ` : ""}
          {report.status}
        </span>
      </div>

      <h3 className="mt-1 text-h3">{report.title}</h3>
      {report.description && (
        <p className="mt-0.5 line-clamp-3 text-body text-ink-soft">
          {report.description}
        </p>
      )}
      <div className="mt-1 text-caption text-ink-muted">
        {formatRelative(new Date(report.createdAt).getTime(), locale)}
        {report.addressText ? ` · ${report.addressText}` : ""}
        {report.contactPhone ? ` · ☎ ${report.contactPhone}` : ""}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {report.status !== "resolved" && (
          <ActButton busy={busy} onClick={() => act(() => resolveReport(report.id))}>
            {t("admin.resolve")}
          </ActButton>
        )}
        {hidden ? (
          <ActButton busy={busy} onClick={() => act(() => restoreReport(report.id))}>
            {t("admin.restore")}
          </ActButton>
        ) : (
          <ActButton busy={busy} onClick={() => act(() => removeReport(report.id))}>
            {t("admin.hide")}
          </ActButton>
        )}
        {report.flagCount > 0 && (
          <ActButton busy={busy} onClick={() => act(() => clearFlags(report.id))}>
            {t("admin.clearFlags")}
          </ActButton>
        )}
        <ActButton busy={busy} onClick={findDuplicates}>
          {t("admin.findDup")}
        </ActButton>
        <ActButton
          busy={busy}
          onClick={() =>
            act(async () => {
              await fetch("/api/extract?force=1", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ kind: "report", clientUuid: report.clientUuid }),
              });
            })
          }
        >
          {t("admin.reExtract")}
        </ActButton>
      </div>

      {dups &&
        (dups.length === 0 ? (
          <p className="mt-2 text-caption text-ink-muted">{t("admin.dupNone")}</p>
        ) : (
          <div className="mt-2 rounded-md bg-surface p-2">
            <p className="text-caption text-ink-muted">{t("admin.dupPrompt")}</p>
            <ul className="mt-1 space-y-1">
              {dups.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(() => mergeReport(report.id, d.id))}
                    className="min-h-11 text-label text-info-text underline disabled:opacity-60"
                  >
                    {d.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </article>
  );
}
