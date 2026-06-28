import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/organisms/shared/app-header";
import { ReportForm } from "@/components/organisms/report/report-form";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getServerT())("report.heading") };
}

export default async function ReportarPage() {
  const t = await getServerT();
  return (
    <>
      <AppHeader
        right={
          <Link href="/" className="text-label text-info-text">
            {t("common.cancel")}
          </Link>
        }
      />
      <main id="main" className="mx-auto max-w-[560px] px-4 pt-6 pb-24">
        <h1 className="text-h1">{t("report.heading")}</h1>
        <p className="mt-1 text-body text-ink-soft">{t("report.subtitle")}</p>
        <div className="mt-6">
          <ReportForm />
        </div>
      </main>
    </>
  );
}
