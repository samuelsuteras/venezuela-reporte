import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/organisms/shared/app-header";
import { TypePin } from "@/components/atoms/type-pin";
import { ReportActions } from "@/components/organisms/report/report-actions";
import { REPORT_TYPES } from "@/lib/report-types";
import { formatRelative } from "@/lib/format";
import { fetchReportById, reportImageUrl } from "@/lib/feed";
import { getLocale, getServerT } from "@/lib/i18n/server";

// Fetches per request (data isn't known at build, and Supabase may be
// unconfigured then). Keeps the page out of the static prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reporte" };

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [t, locale, report] = await Promise.all([
    getServerT(),
    getLocale(),
    fetchReportById(id).catch(() => null),
  ]);
  const meta = report ? REPORT_TYPES[report.type] : null;

  return (
    <>
      <AppHeader
        right={
          <Link href="/reportes" className="text-label text-info-text">
            {t("common.back")}
          </Link>
        }
      />
      <main id="main" className="mx-auto max-w-[560px] px-4 pt-6 pb-24">
        {!report || !meta ? (
          <p className="rounded-lg border border-hairline-soft bg-surface p-6 text-center text-body-lg">
            {t("detail.notFound")}
          </p>
        ) : (
          <article>
            <div className="flex items-center gap-2">
              <TypePin type={report.type} />
              <span className={`text-label ${meta.text}`}>
                {t(meta.labelKey)}
              </span>
              {report.status === "resolved" && (
                <span className="rounded-pill bg-surface px-2 py-0.5 text-caption text-status-synced">
                  {t("detail.resolved")}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-h1">{report.title}</h1>
            <p className="mt-1 text-caption text-ink-muted">
              {formatRelative(new Date(report.createdAt).getTime(), locale)}
              {report.addressText ? ` · ${report.addressText}` : ""}
            </p>

            {report.description && (
              <p className="mt-4 text-body-lg whitespace-pre-wrap">
                {report.description}
              </p>
            )}

            {report.imagePaths.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {report.imagePaths.map((path, i) => {
                  const url = reportImageUrl(path);
                  return url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Supabase asset
                    <img
                      key={path}
                      src={url}
                      alt={t("detail.photoAlt", { n: i + 1 })}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  ) : null;
                })}
              </div>
            )}

            {report.lat != null && report.lng != null && (
              <p className="mt-4 text-body text-ink-soft">
                📍 {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
              </p>
            )}

            <ReportActions reportId={report.id} />
          </article>
        )}
      </main>
    </>
  );
}
