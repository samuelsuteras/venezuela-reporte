"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { getT, type Translator } from "./index";

const LocaleContext = createContext<{ locale: Locale; t: Translator }>({
  locale: DEFAULT_LOCALE,
  t: getT(DEFAULT_LOCALE),
});

/**
 * Provides the active locale + translator to client components. The `locale`
 * comes from the server layout (cookie), so server and client agree. Toggling
 * sets the cookie and calls router.refresh(), which re-renders both.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: getT(locale) }), [locale]);
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useT(): Translator {
  return useContext(LocaleContext).t;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
