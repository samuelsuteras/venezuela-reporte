"use client";

import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/lib/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

/**
 * Language switch (ES ⇄ EN). Persists the choice in a cookie and calls
 * router.refresh() so both server and client components re-render in the new
 * language.
 */
export function LocaleToggle() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();

  function switchTo(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => switchTo(locale === "es" ? "en" : "es")}
      aria-label={t("locale.switchAria")}
      className="min-h-11 text-label text-info-text"
    >
      {t("locale.switch")}
    </button>
  );
}
