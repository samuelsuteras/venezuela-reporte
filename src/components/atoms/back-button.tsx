"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";

/** Back button that returns to wherever the user came from (feed, map, list). */
export function BackButton() {
  const router = useRouter();
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-3 inline-flex min-h-11 items-center text-label text-info-text"
    >
      ← {t("common.back")}
    </button>
  );
}
