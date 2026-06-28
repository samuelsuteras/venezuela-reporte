import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reporte.ve";

/** robots.txt — index public pages, keep the admin + dev surfaces out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/dev/"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
