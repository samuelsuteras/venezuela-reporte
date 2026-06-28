import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/organisms/shared/app-header";
import { MyReportsList } from "@/components/organisms/report/my-reports-list";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getServerT())("mine.heading") };
}

export default async function MisReportesPage() {
  const t = await getServerT();
  return (
    <>
      <AppHeader
        right={
          <Link href="/reportar" className="text-label text-info-text">
            {t("common.new")}
          </Link>
        }
      />
      <main id="main" className="mx-auto max-w-[560px] px-4 pt-6 pb-28">
        <h1 className="text-h1">{t("mine.heading")}</h1>
        <p className="mt-1 text-body text-ink-soft">{t("mine.subtitle")}</p>
        <div className="mt-6">
          <MyReportsList />
        </div>
      </main>
    </>
  );
}
