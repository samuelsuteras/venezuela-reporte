"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/atoms/button";
import { FilterBar } from "@/components/molecules/filter-bar";
import { PublicReportCard } from "@/components/molecules/public-report-card";
import { ReportCardBones } from "@/components/ui/loading-bones";
import { fetchReports, subscribeReports, type PublicReport } from "@/lib/feed";
import { fetchHubReports } from "@/lib/hub-feed";
import { isSupabaseConfigured } from "@/lib/supabase";
import { REPORT_TYPE_ORDER } from "@/lib/report-types";
import { useT } from "@/lib/i18n/client";
import type { ReportType } from "@/lib/types";

const PAGE = 20;
/** Hub section fetches at most this many reports per type (5 types × 20 = 100 max). */
const HUB_LIMIT = 20;
/** Hub cards shown per "Ver más" step. The pool is fetched once, sorted
 * newest-first (see fetchHubReports), and revealed client-side in slices. */
const HUB_PAGE = 10;

/**
 * Public discovery feed: newest-first list of verified reports with type
 * filters, keyset "load more" pagination, and live updates via Supabase
 * Realtime. Below the local feed a dedicated section surfaces the latest
 * reports from the venezuela-ayuda national hub.
 *
 * @client-component Owns filter state and async data fetching.
 */
export function ReportFeed() {
  const t = useT();
  const [selected, setSelected] = useState<Set<ReportType>>(
    new Set(REPORT_TYPE_ORDER),
  );
  const [reports, setReports] = useState<PublicReport[] | null>(null);
  const [done, setDone] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Hub section state: null = loading, [] = empty/error, [...] = loaded.
  const [hubReports, setHubReports] = useState<PublicReport[] | null>(null);
  // How many hub cards are revealed (client-side pagination over the pool).
  const [hubVisible, setHubVisible] = useState(HUB_PAGE);

  // Monotonic request token — only the latest fetch may commit, so rapid filter
  // toggles / realtime pings can't race. setState runs only after the await
  // (the previous list stays visible while refreshing).
  const reqRef = useRef(0);

  const loadFirst = useCallback(async () => {
    const req = ++reqRef.current;
    try {
      const data = await fetchReports({ types: [...selected], limit: PAGE });
      if (req !== reqRef.current) return;
      setReports(data);
      setDone(data.length < PAGE);
    } catch {
      if (req === reqRef.current) setReports([]);
    }
  }, [selected]);

  // (Re)load on filter change — loadFirst's identity changes with `selected`.
  // setState runs only after the fetch resolves (async), not synchronously,
  // so this is the sanctioned fetch-in-effect pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFirst();
  }, [loadFirst]);

  // Realtime: refresh the first page on any change.
  useEffect(() => {
    const unsubscribe = subscribeReports(() => void loadFirst());
    return unsubscribe;
  }, [loadFirst]);

  // Hub section: fetched once on mount (hub has no realtime subscription).
  // Runs independently of the local feed so a hub outage never blocks local
  // report display. setState runs inside an async .then() (not synchronously in
  // the effect body), so the react-hooks/set-state-in-effect rule doesn't apply.
  useEffect(() => {
    let active = true;
    void fetchHubReports({ limit: HUB_LIMIT }).then((data) => {
      if (active) setHubReports(data);
    });
    return () => {
      active = false;
    };
  }, []);

  async function loadMore() {
    if (!reports?.length) return;
    setLoadingMore(true);
    try {
      const before = reports[reports.length - 1].createdAt;
      const more = await fetchReports({
        types: [...selected],
        limit: PAGE,
        before,
      });
      setReports([...reports, ...more]);
      setDone(more.length < PAGE);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <FilterBar value={selected} onChange={setSelected} />

      {!isSupabaseConfigured && (
        <p className="mt-4 rounded-lg bg-surface p-4 text-body text-ink-soft">
          {t("feed.noBackend")}
        </p>
      )}

      {/* ── Local reports ── */}
      <div className="mt-4 space-y-3">
        {reports === null ? (
          [0, 1, 2].map((i) => (
            <ReportCardBones key={i} loading>
              <div />
            </ReportCardBones>
          ))
        ) : reports.length === 0 ? (
          <p className="rounded-lg border border-hairline-soft bg-surface p-6 text-center text-body-lg">
            {t("feed.empty")}
          </p>
        ) : (
          reports.map((r) => <PublicReportCard key={r.id} report={r} />)
        )}
      </div>

      {reports && reports.length > 0 && !done && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            onClick={loadMore}
            disabled={loadingMore}
            aria-busy={loadingMore}
          >
            {loadingMore ? t("common.loading") : t("common.seeMore")}
          </Button>
        </div>
      )}

      {/* ── National hub section ── */}
      <section aria-label={t("feed.hubSection")} className="mt-8">
        <h2 className="mb-3 text-h3 text-ink-soft">
          {t("feed.hubSection")}
        </h2>

        {hubReports === null ? (
          // Loading state: reuse the same skeleton as local cards.
          [0, 1, 2].map((i) => (
            <ReportCardBones key={i} loading>
              <div />
            </ReportCardBones>
          ))
        ) : hubReports.length === 0 ? (
          <p className="rounded-lg border border-hairline-soft bg-surface p-6 text-center text-body">
            {t("feed.hubEmpty")}
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {hubReports.slice(0, hubVisible).map((r) => (
                <PublicReportCard key={r.id} report={r} />
              ))}
            </div>
            {hubVisible < hubReports.length && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setHubVisible((v) => v + HUB_PAGE)}
                >
                  {t("common.seeMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
