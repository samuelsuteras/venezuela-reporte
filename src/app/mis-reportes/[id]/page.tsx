import type { Metadata } from "next";
import { AppHeader } from "@/components/organisms/shared/app-header";
import { MyReportDetailView } from "@/components/organisms/report/my-report-detail-view";

export const metadata: Metadata = { title: "Reporte" };

export default async function MyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <AppHeader />
      <main id="main" className="mx-auto max-w-[560px] px-4 pt-6 pb-24">
        <MyReportDetailView id={id} />
      </main>
    </>
  );
}
