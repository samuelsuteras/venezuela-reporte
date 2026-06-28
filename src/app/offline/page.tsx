"use client";

import { useT } from "@/lib/i18n/client";

/** Offline fallback shown by the service worker when a navigation fails with no
 * network. Reporting still works (it's local-first), so the message reassures. */
export default function OfflinePage() {
  const t = useT();
  return (
    <main id="main" className="mx-auto max-w-[560px] px-4 pt-10 pb-24 text-center">
      <h1 className="text-h1">{t("offlinePage.title")}</h1>
      <p className="mt-3 text-body-lg text-ink-soft">{t("offlinePage.body")}</p>
    </main>
  );
}
