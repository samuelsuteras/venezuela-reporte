import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/organisms/shared/app-header";
import { ReportDetailView } from "@/components/organisms/report/report-detail-view";
import { getServerT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Reporte" };

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getServerT();
  return (
    <>
      <AppHeader
        right={
          <Link href="/reportes" className="text-label text-info-text">
            {t("common.back")}
          </Link>
        }
      />
      <main id="main" className="mx-auto max-w-[560px] px-4 pt-6 pb-24">
        <ReportDetailView id={id} />
      </main>
    </>
  );
}
