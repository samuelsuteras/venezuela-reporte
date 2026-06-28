"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

/**
 * Image grid where each thumbnail opens full-screen in a tap-to-close lightbox
 * (Esc also closes). No dependency — just a fixed overlay. Works for both remote
 * URLs and local blob object URLs.
 */
export function ImageGallery({ urls }: { urls: string[] }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (urls.length === 0) return null;

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {urls.map((u, i) => (
          <button
            key={u}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={t("detail.viewPhoto", { n: i + 1 })}
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- report photo (remote or local blob) */}
            <img
              src={u}
              alt={t("detail.photoAlt", { n: i + 1 })}
              loading="lazy"
              className="aspect-square w-full rounded-md object-cover"
            />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("detail.photoAlt", { n: open + 1 })}
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- full-size report photo */}
          <img
            src={urls[open]}
            alt={t("detail.photoAlt", { n: open + 1 })}
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label={t("common.close")}
            className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-pill bg-canvas/90 text-h3 text-ink"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
