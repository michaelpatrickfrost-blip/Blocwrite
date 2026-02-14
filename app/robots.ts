import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/studio/",
          "/admin/",
          "/dashboard/",
          "/api/",
          "/login",
          "/reset-password",
          "/activate",
        ],
      },
    ],
    sitemap: "https://blocwrite.com/sitemap.xml",
  };
}
