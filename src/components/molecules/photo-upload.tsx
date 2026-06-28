"use client";

import { useEffect, useMemo, useState } from "react";
import { compressImage } from "@/lib/reports";
import { useT } from "@/lib/i18n/client";

/**
 * Camera/gallery photo input. Compresses each picked image to a small WebP blob
 * up front (the parent owns the resulting `Blob[]`). On mobile the file input
 * opens the camera (`capture="environment"`). Previews use object URLs that are
 * revoked when the set changes.
 */
export function PhotoUpload({
  value,
  onChange,
}: {
  value: Blob[];
  onChange: (blobs: Blob[]) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const previews = useMemo(
    () => value.map((b) => URL.createObjectURL(b)),
    [value],
  );
  useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews],
  );

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(undefined);
    try {
      const compressed = await Promise.all(
        Array.from(files).map((f) => compressImage(f)),
      );
      onChange([...value, ...compressed]);
    } catch {
      setError(t("report.photoError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="text-label">{t("report.photosLabel")}</span>
      <label
        className="mt-1 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-hairline bg-surface p-4 text-center text-body text-ink-soft peer-focus-visible:ring-2"
        aria-busy={busy}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="peer sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {busy ? t("report.photoProcessing") : t("report.photosCta")}
        <span className="mt-1 text-caption text-ink-muted">
          {t("report.photosHint")}
        </span>
      </label>

      {error && (
        <p className="mt-1 text-caption text-danger" role="alert">
          {error}
        </p>
      )}

      {previews.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {previews.map((url, i) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote asset */}
              <img
                src={url}
                alt={t("detail.photoAlt", { n: i + 1 })}
                className="size-20 rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label={t("report.removePhoto", { n: i + 1 })}
                className="absolute -top-2 -right-2 inline-flex size-7 items-center justify-center rounded-pill bg-ink text-on-night"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
