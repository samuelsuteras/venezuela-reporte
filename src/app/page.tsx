import Link from "next/link";
import { AppHeader } from "@/components/organisms/shared/app-header";
import { TypePin } from "@/components/atoms/type-pin";
import { REPORT_TYPE_ORDER, REPORT_TYPES } from "@/lib/report-types";
import { getServerT } from "@/lib/i18n/server";

/** Landing: intro + the 4-color taxonomy legend. */
export default async function HomePage() {
  const t = await getServerT();
  return (
    <>
      <AppHeader
        right={
          <Link href="/mis-reportes" className="text-label text-info-text">
            {t("home.myReports")}
          </Link>
        }
      />

      <main id="main" className="mx-auto max-w-[560px] px-4 pt-6 pb-28">
        <h1 className="text-display">{t("home.title")}</h1>
        <p className="mt-3 text-body-lg text-ink-soft">{t("home.intro")}</p>

        <h2 className="mt-8 text-h2">{t("home.typesHeading")}</h2>
        <ul className="mt-3 space-y-3">
          {REPORT_TYPE_ORDER.map((key) => {
            const meta = REPORT_TYPES[key];
            return (
              <li
                key={key}
                className="flex gap-3 rounded-lg border border-hairline-soft bg-canvas p-4"
              >
                <TypePin type={key} className="mt-0.5" />
                <div>
                  <p className={`text-h3 ${meta.text}`}>{t(meta.labelKey)}</p>
                  <p className="mt-0.5 text-body text-ink-soft">
                    {t(meta.descKey)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
