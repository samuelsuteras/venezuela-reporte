"use client";

import { CallButton } from "@/components/molecules/call-button";
import { useT } from "@/lib/i18n/client";
import type { Extracted } from "@/lib/extract/types";

/**
 * One labeled row of text chips. Hoisted to module scope (stable component
 * identity — no remount churn on parent re-render) and given the already-
 * translated `label` so it needs no translator. Hidden when `values` is empty.
 *
 * @param icon - Unicode emoji identifying the category; `aria-hidden` so screen
 *   readers announce only the text `label`, not the emoji's name.
 * @param label - Translated, human-readable category label.
 * @param values - Strings to render as chips.
 */
function Row({
  icon,
  label,
  values,
}: {
  icon: string;
  label: string;
  values: string[];
}) {
  if (!values.length) return null;
  return (
    <div className="mt-2">
      <span className="text-caption text-ink-muted">
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      <ul className="mt-1 flex flex-wrap gap-1">
        {values.map((v) => (
          <li key={v} className="rounded-pill bg-canvas px-2 py-0.5 text-body">
            {v}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Read-only display of structured data extracted from a report/note.
 *
 * Client component — uses `useT()` for locale-aware labels. Renders nothing
 * (returns null) when `extracted` is null or all five categories are empty.
 *
 * a11y: each category renders an icon + Spanish label, never color alone
 * (grayscale screenshot stays usable); emoji icons are `aria-hidden` so the
 * text label is what's announced. External links use `rel="noopener nofollow"`
 * and meet the 44 px touch-target minimum via `min-h-11 inline-flex
 * items-center`. Phone numbers delegate to `CallButton`.
 *
 * @param extracted - Structured data pulled from free text, or null when
 *   extraction has not run yet.
 */
export function ExtractedChips({ extracted }: { extracted: Extracted | null }) {
  const t = useT();

  if (!extracted) return null;
  const { cedulas, phones, links, names, addresses } = extracted;
  if (
    !cedulas.length &&
    !phones.length &&
    !links.length &&
    !names.length &&
    !addresses.length
  )
    return null;

  return (
    <section
      className="mt-4 rounded-lg border border-hairline-soft bg-surface p-3"
      aria-label={t("detail.extracted")}
    >
      <h2 className="text-label text-ink-muted">{t("detail.extracted")}</h2>
      <Row icon="👤" label={t("extracted.names")} values={names} />
      <Row icon="🪪" label={t("extracted.cedula")} values={cedulas} />
      <Row icon="📍" label={t("extracted.addresses")} values={addresses} />
      {phones.length > 0 && (
        <div className="mt-2">
          <span className="text-caption text-ink-muted">
            <span aria-hidden="true">📞</span> {t("extracted.phones")}
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {phones.map((p) => (
              <CallButton key={p} phone={p} />
            ))}
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div className="mt-2">
          <span className="text-caption text-ink-muted">
            <span aria-hidden="true">🔗</span> {t("extracted.links")}
          </span>
          <ul className="mt-1 flex flex-col gap-1">
            {links.map((l) => (
              <li key={l}>
                {/* ponytail: link preview (title/favicon) is a nice-to-have ceiling */}
                <a
                  href={l}
                  target="_blank"
                  rel="noopener nofollow"
                  className="min-h-11 inline-flex items-center text-body text-link-cool-1 underline break-all"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
