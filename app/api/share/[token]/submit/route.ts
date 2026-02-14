import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/share/[token]/submit — Public: reader marks feedback as submitted
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      select: { id: true, status: true, expiresAt: true },
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

    await prisma.shareLink.update({
      where: { token },
      data: { status: "submitted" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Submit feedback error:", error);
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}
