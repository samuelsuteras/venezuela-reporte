import type { Metadata } from "next";
import { AppHeader } from "@/components/organisms/shared/app-header";
import { MapView } from "@/components/organisms/map/map-view";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getServerT())("nav.map") };
}

export default function MapaPage() {
  return (
    <>
      <AppHeader />
      <main id="main">
        <MapView />
      </main>
    </>
  );
}
