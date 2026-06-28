"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/button";
import { ReportTypeSelector } from "@/components/molecules/report-type-selector";
import { TextField } from "@/components/molecules/text-field";
import { PhotoUpload } from "@/components/molecules/photo-upload";
import {
  LocationPicker,
  type LocationValue,
} from "@/components/molecules/location-picker";
import { enqueueReport } from "@/lib/reports";
import { useT } from "@/lib/i18n/client";
import type { ReportType } from "@/lib/types";

/**
 * The report form. Submits to the local outbox (IndexedDB) — works fully
 * offline — then routes to "Mis reportes". Validation is minimal and inline:
 * a type and a 3+ char title are required; everything else is optional. Errors
 * clear on the next keystroke/selection.
 */
export function ReportForm() {
  const router = useRouter();
  const t = useT();
  const [type, setType] = useState<ReportType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [images, setImages] = useState<Blob[]>([]);
  const [location, setLocation] = useState<LocationValue>({});
  const [errors, setErrors] = useState<{ type?: string; title?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!type) next.type = t("report.errType");
    if (title.trim().length < 3) next.title = t("report.errTitle");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await enqueueReport({
        type: type!,
        title: title.trim(),
        description: description.trim() || undefined,
        contactPhone: phone.trim() || undefined,
        addressText: location.addressText?.trim() || undefined,
        lat: location.lat,
        lng: location.lng,
        images,
      });
      router.push("/mis-reportes");
    } catch {
      // ponytail: an IndexedDB write rarely fails; surface inline if it does.
      setSubmitting(false);
      setErrors({ title: t("report.errSave") });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <ReportTypeSelector
        value={type}
        error={errors.type}
        onChange={(t) => {
          setType(t);
          setErrors((e) => ({ ...e, type: undefined }));
        }}
      />

      <TextField
        id="title"
        label={t("report.titleLabel")}
        required
        value={title}
        onChange={(v) => {
          setTitle(v);
          setErrors((e) => ({ ...e, title: undefined }));
        }}
        error={errors.title}
        maxLength={120}
        hint={t("report.titleHint")}
      />

      <TextField
        id="description"
        label={t("report.descLabel")}
        multiline
        value={description}
        onChange={setDescription}
        maxLength={2000}
        hint={t("report.descHint")}
      />

      <PhotoUpload value={images} onChange={setImages} />

      <LocationPicker value={location} onChange={setLocation} />

      <TextField
        id="phone"
        label={t("report.phoneLabel")}
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={setPhone}
        autoComplete="tel"
        maxLength={30}
        hint={t("report.phoneHint")}
      />

      <Button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="w-full"
      >
        {submitting ? t("report.submitting") : t("report.submit")}
      </Button>

      <p className="text-caption text-ink-muted">{t("report.savedNote")}</p>
    </form>
  );
}
