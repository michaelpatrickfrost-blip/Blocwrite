import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

/** GET /api/admin/blog — list all posts (admin) */
export async function GET() {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(posts);
}

/** POST /api/admin/blog — create or update a post */
export async function POST(req: NextRequest) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, title, excerpt, content, coverImage, published } = body as {
    id?: string;
    title?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string | null;
    published?: boolean;
  };

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  if (id) {
    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        title: title.trim(),
        slug: slugify(title.trim()),
        excerpt: excerpt?.trim() || null,
        content: content || "",
        coverImage: coverImage ?? null,
        published: published ?? false,
        publishedAt: published ? new Date() : null,
      },
    });
    return NextResponse.json({ ok: true, post });
  }

  let slug = slugify(title.trim());
  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const post = await prisma.blogPost.create({
    data: {
      title: title.trim(),
      slug,
      excerpt: excerpt?.trim() || null,
      content: content || "",
      coverImage: coverImage ?? null,
      published: published ?? false,
      publishedAt: published ? new Date() : null,
    },
  });
  return NextResponse.json({ ok: true, post });
}

/** DELETE /api/admin/blog — delete a post */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.blogPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
