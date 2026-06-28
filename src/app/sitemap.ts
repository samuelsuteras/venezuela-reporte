import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reporte.ve";

/** Sitemap of the public, indexable routes. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/reportar", "/reportes", "/mapa", "/mis-reportes"];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "/reportes" || path === "" ? "hourly" : "daily",
    priority: path === "" ? 1 : 0.7,
  }));
}
