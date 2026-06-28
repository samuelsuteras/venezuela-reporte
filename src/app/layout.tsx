import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SkipLink } from "@/components/atoms/skip-link";
import { OfflineBanner } from "@/components/organisms/shared/offline-banner";
import { BottomNav } from "@/components/organisms/shared/bottom-nav";
import { SyncProvider } from "@/components/organisms/shared/sync-provider";
import { SyncToast } from "@/components/organisms/shared/sync-toast";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale, getServerT } from "@/lib/i18n/server";

/**
 * Localized root metadata. No web font is loaded — the app renders in
 * `system-ui` (DESIGN.md § Typography) for instant paint on 2G.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://reporte.ve",
    ),
    applicationName: t("app.name"),
    title: {
      default: `${t("app.name")} — ${t("app.tagline")}`,
      template: `%s · ${t("app.name")}`,
    },
    description: t("home.intro"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: t("app.name") },
    icons: { icon: "/icon.svg", apple: "/icon.svg" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0f1722",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-canvas text-ink">
        <LocaleProvider locale={locale}>
          <SkipLink />
          <OfflineBanner />
          {children}
          <BottomNav />
          <SyncProvider />
          <SyncToast />
        </LocaleProvider>
      </body>
    </html>
  );
}
