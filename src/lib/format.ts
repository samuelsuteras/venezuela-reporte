import { DEFAULT_LOCALE, type Locale } from "./i18n/config";

const STEPS: { limit: number; div: number; unit: Intl.RelativeTimeFormatUnit }[] =
  [
    { limit: 60_000, div: 1_000, unit: "second" },
    { limit: 3_600_000, div: 60_000, unit: "minute" },
    { limit: 86_400_000, div: 3_600_000, unit: "hour" },
    { limit: 604_800_000, div: 86_400_000, unit: "day" },
  ];

/** Human relative time in the given locale, e.g. "hace 5 minutos" / "5 minutes
 * ago". `ts` is epoch ms. */
export function formatRelative(ts: number, locale: Locale = DEFAULT_LOCALE): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  for (const { limit, div, unit } of STEPS) {
    if (abs < limit) return rtf.format(Math.round(diff / div), unit);
  }
  return rtf.format(Math.round(diff / 604_800_000), "week");
}
