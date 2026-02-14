import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/share/feedback — Authenticated: author views received feedback
 * Returns all ShareLinks with status "submitted" for the current user, including annotations
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = verifySessionToken(token);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const links = await prisma.shareLink.findMany({
      where: {
        ownerEmail: email.trim().toLowerCase(),
        status: "submitted",
      },
      orderBy: { createdAt: "desc" },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            annotations: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json(
      links.map((link) => ({
        id: link.id,
        token: link.token,
        novelId: link.novelId,
        readerName: link.readerName,
        status: link.status,
        createdAt: link.createdAt.toISOString(),
        chapters: link.chapters.map((ch) => ({
          id: ch.id,
          title: ch.chapterTitle,
          content: ch.chapterContent,
          order: ch.order,
          annotations: ch.annotations.map((a) => ({
            id: a.id,
            selectedText: a.selectedText,
            startOffset: a.startOffset,
            endOffset: a.endOffset,
            note: a.note,
            type: a.type,
            createdAt: a.createdAt.toISOString(),
          })),
        })),
      })),
    );
  } catch (error) {
    console.error("Fetch feedback error:", error);
    return NextResponse.json({ error: "Failed to fetch feedback." }, { status: 500 });
  }
}
