import type { MetadataRoute } from "next";

/**
 * PWA manifest, served at `/manifest.webmanifest`. Makes the app installable
 * and standalone. Icons are SVG for now (zero rasterization deps); a PNG +
 * Apple-touch set is a parked follow-up (see tasks/todo.md).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reporte VE — Emergencia Venezuela",
    short_name: "Reporte VE",
    description:
      "Reporta y encuentra personas, necesidades y ayuda tras el terremoto. Funciona sin conexión.",
    lang: "es",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f1722",
    categories: ["utilities", "social", "navigation"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
