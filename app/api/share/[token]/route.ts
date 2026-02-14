import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/share/[token] — Public: fetch shared chapters for reading
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
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

    if (!shareLink) {
      return NextResponse.json(
        { error: "Share link not found." },
        { status: 404 },
      );
    }

    if (shareLink.status === "revoked") {
      return NextResponse.json(
        { error: "This share link has been revoked." },
        { status: 410 },
      );
    }

    if (new Date() > shareLink.expiresAt) {
      return NextResponse.json(
        { error: "This share link has expired." },
        { status: 410 },
      );
    }

    return NextResponse.json({
      token: shareLink.token,
      status: shareLink.status,
      expiresAt: shareLink.expiresAt.toISOString(),
      readerName: shareLink.readerName,
      chapters: shareLink.chapters.map((ch) => ({
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
    });
  } catch (error) {
    console.error("Fetch shared chapters error:", error);
    return NextResponse.json(
      { error: "Failed to load shared content." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/share/[token] — Authenticated: author revokes a share link
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = verifySessionToken(sessionToken);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink || shareLink.ownerEmail !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Share link not found." },
        { status: 404 },
      );
    }

    await prisma.shareLink.update({
      where: { token },
      data: { status: "revoked" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Revoke share link error:", error);
    return NextResponse.json(
      { error: "Failed to revoke share link." },
      { status: 500 },
    );
  }
}
