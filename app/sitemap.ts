import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://blocwrite.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/subscribe`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/refunds`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
        publishedAt: { lte: new Date() },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        slug: true,
        publishedAt: true,
        updatedAt: true,
      },
      take: 5000,
    });

    const newsRoutes: MetadataRoute.Sitemap = posts
      .filter((post) => typeof post.slug === "string" && post.slug.trim().length > 0)
      .map((post) => ({
        url: `${BASE_URL}/news/${post.slug}`,
        lastModified: (post.updatedAt ?? post.publishedAt ?? new Date()).toISOString(),
        changeFrequency: "weekly",
        priority: 0.7,
      }));

    return [...staticRoutes, ...newsRoutes];
  } catch {
    // Never break sitemap generation if DB is temporarily unavailable.
    return staticRoutes;
  }
}
