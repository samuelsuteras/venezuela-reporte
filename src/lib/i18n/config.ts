export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Spanish is the default — the primary audience is in Venezuela. */
export const DEFAULT_LOCALE: Locale = "es";

/** Cookie that persists the user's language choice (read on server + client). */
export const LOCALE_COOKIE = "reporteve_locale";

export function isLocale(value: string | undefined): value is Locale {
  return value === "es" || value === "en";
}
