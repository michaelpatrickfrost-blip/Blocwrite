import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/share/[token]/annotate — Public: reader saves annotations
 * Body: { readerName?, annotations: [{ sharedChapterId, selectedText, startOffset, endOffset, note, type }] }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    // Validate the share link
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      select: { id: true, status: true, expiresAt: true, chapters: { select: { id: true } } },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Share link not found." }, { status: 404 });
    }
    if (shareLink.status === "revoked") {
      return NextResponse.json({ error: "This share link has been revoked." }, { status: 410 });
    }
    if (new Date() > shareLink.expiresAt) {
      return NextResponse.json({ error: "This share link has expired." }, { status: 410 });
    }

    const body = (await request.json()) as {
      readerName?: string;
      annotations?: Array<{
        sharedChapterId: string;
        selectedText: string;
        startOffset: number;
        endOffset: number;
        note: string;
        type?: string;
      }>;
    };

    const { annotations, readerName } = body;

    if (!annotations || annotations.length === 0) {
      return NextResponse.json({ error: "At least one annotation is required." }, { status: 400 });
    }

    // Validate all chapter IDs belong to this share link
    const validChapterIds = new Set(shareLink.chapters.map((c) => c.id));
    for (const ann of annotations) {
      if (!validChapterIds.has(ann.sharedChapterId)) {
        return NextResponse.json({ error: "Invalid chapter reference." }, { status: 400 });
      }
    }

    // Save reader name if provided
    if (readerName?.trim()) {
      await prisma.shareLink.update({
        where: { token },
        data: { readerName: readerName.trim() },
      });
    }

    // Create all annotations
    await prisma.annotation.createMany({
      data: annotations.map((ann) => ({
        sharedChapterId: ann.sharedChapterId,
        selectedText: ann.selectedText,
        startOffset: ann.startOffset,
        endOffset: ann.endOffset,
        note: ann.note,
        type: ann.type || "comment",
      })),
    });

    return NextResponse.json({ ok: true, count: annotations.length });
  } catch (error) {
    console.error("Save annotations error:", error);
    return NextResponse.json({ error: "Failed to save annotations." }, { status: 500 });
  }
}
