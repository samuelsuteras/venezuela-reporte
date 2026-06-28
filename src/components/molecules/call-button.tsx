"use client";

import { useT } from "@/lib/i18n/client";

/** One-tap call button (`tel:` link) for a report's contact phone. */
export function CallButton({ phone }: { phone: string }) {
  const t = useT();
  return (
    <a
      href={`tel:${phone}`}
      className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-md bg-info px-5 text-button text-info-on"
    >
      📞 {t("detail.call")} {phone}
    </a>
  );
}
