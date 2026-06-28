import type { MessageKey } from "./i18n/messages";
import type { ReportType } from "./types";

/**
 * Single source of truth for the 4-color taxonomy: i18n message keys for the
 * label/description, an icon glyph, and the Tailwind token classes per surface.
 * Render color + icon + label together — color is never the only signal
 * (DESIGN.md § Accessibility). Class strings are literals so Tailwind scans them.
 */
export interface ReportTypeMeta {
  key: ReportType;
  labelKey: MessageKey;
  descKey: MessageKey;
  /** Glyph inside pins/tiles (aria-hidden; the label carries meaning). */
  icon: string;
  fill: string;
  on: string;
  text: string;
  accent: string;
}

export const REPORT_TYPES: Record<ReportType, ReportTypeMeta> = {
  emergency: {
    key: "emergency",
    labelKey: "type.emergency.label",
    descKey: "type.emergency.desc",
    icon: "▲",
    fill: "bg-emergency",
    on: "text-emergency-on",
    text: "text-emergency-text",
    accent: "border-l-emergency",
  },
  need: {
    key: "need",
    labelKey: "type.need.label",
    descKey: "type.need.desc",
    icon: "◆",
    fill: "bg-need",
    on: "text-need-on",
    text: "text-need-text",
    accent: "border-l-need",
  },
  info: {
    key: "info",
    labelKey: "type.info.label",
    descKey: "type.info.desc",
    icon: "●",
    fill: "bg-info",
    on: "text-info-on",
    text: "text-info-text",
    accent: "border-l-info",
  },
  resolved: {
    key: "resolved",
    labelKey: "type.resolved.label",
    descKey: "type.resolved.desc",
    icon: "✓",
    fill: "bg-resolved",
    on: "text-resolved-on",
    text: "text-resolved-text",
    accent: "border-l-resolved",
  },
  pet: {
    key: "pet",
    labelKey: "type.pet.label",
    descKey: "type.pet.desc",
    icon: "🐾",
    fill: "bg-pet",
    on: "text-pet-on",
    text: "text-pet-text",
    accent: "border-l-pet",
  },
};

/** Stable display order (severity-first). */
export const REPORT_TYPE_ORDER: ReportType[] = [
  "emergency",
  "need",
  "info",
  "pet",
  "resolved",
];
