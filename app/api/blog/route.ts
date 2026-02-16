import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/blog — list published posts whose publishedAt has passed (public) */
export async function GET() {
  const now = new Date();
  const posts = await prisma.blogPost.findMany({
    where: {
      published: true,
      publishedAt: { lte: now },
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      coverImage: true,
      publishedAt: true,
    },
  });
  return NextResponse.json(posts);
}
