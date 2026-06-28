import type { Metadata } from "next";
import { AppHeader } from "@/components/organisms/shared/app-header";
import { ReportFeed } from "@/components/organisms/report/report-feed";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getServerT())("feed.heading") };
}

export default async function ReportesPage() {
  const t = await getServerT();
  return (
    <>
      <AppHeader />
      <main id="main" className="mx-auto max-w-[560px] px-4 pt-6 pb-24">
        <h1 className="text-h1">{t("feed.heading")}</h1>
        <p className="mt-1 text-body text-ink-soft">{t("feed.subtitle")}</p>
        <div className="mt-4">
          <ReportFeed />
        </div>
      </main>
    </>
  );
}
