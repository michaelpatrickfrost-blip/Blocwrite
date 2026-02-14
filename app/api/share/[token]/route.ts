import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Helper to build the full chapter payload from a share link. */
function buildChaptersPayload(shareLink: {
  token: string;
  status: string;
  expiresAt: Date;
  readerName: string | null;
  chapters: Array<{
    id: string;
    chapterTitle: string;
    chapterContent: string;
    order: number;
    annotations: Array<{
      id: string;
      selectedText: string;
      startOffset: number;
      endOffset: number;
      note: string;
      type: string;
      createdAt: Date;
    }>;
  }>;
}) {
  return {
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
  };
}

async function loadShareLink(token: string) {
  return prisma.shareLink.findUnique({
    where: { token },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          annotations: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
}

function validateLinkStatus(shareLink: { status: string; expiresAt: Date }) {
  if (shareLink.status === "revoked") {
    return { error: "This share link has been revoked.", status: 410 };
  }
  if (new Date() > shareLink.expiresAt) {
    return { error: "This share link has expired.", status: 410 };
  }
  return null;
}

/**
 * GET /api/share/[token] — Public: fetch shared chapters for reading.
 * If password-protected, returns { requiresPassword: true } instead of content.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const shareLink = await loadShareLink(token);
    if (!shareLink) {
      return NextResponse.json({ error: "Share link not found." }, { status: 404 });
    }

    const validity = validateLinkStatus(shareLink);
    if (validity) {
      return NextResponse.json({ error: validity.error }, { status: validity.status });
    }

    // If password protected, don't return content yet
    if (shareLink.passwordHash) {
      return NextResponse.json({
        requiresPassword: true,
        token: shareLink.token,
        expiresAt: shareLink.expiresAt.toISOString(),
        status: shareLink.status,
      });
    }

    return NextResponse.json(buildChaptersPayload(shareLink));
  } catch (error) {
    console.error("Fetch shared chapters error:", error);
    return NextResponse.json({ error: "Failed to load shared content." }, { status: 500 });
  }
}

/**
 * POST /api/share/[token] — Public: verify password and return content.
 * Body: { password: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const shareLink = await loadShareLink(token);
    if (!shareLink) {
      return NextResponse.json({ error: "Share link not found." }, { status: 404 });
    }

    const validity = validateLinkStatus(shareLink);
    if (validity) {
      return NextResponse.json({ error: validity.error }, { status: validity.status });
    }

    if (!shareLink.passwordHash) {
      // No password needed — just return content
      return NextResponse.json(buildChaptersPayload(shareLink));
    }

    const body = (await request.json()) as { password?: string };
    if (!body.password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const match = await bcrypt.compare(body.password, shareLink.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    return NextResponse.json(buildChaptersPayload(shareLink));
  } catch (error) {
    console.error("Share password verify error:", error);
    return NextResponse.json({ error: "Failed to verify password." }, { status: 500 });
  }
}

/**
 * PATCH /api/share/[token] — Authenticated: mark feedback as reviewed.
 */
export async function PATCH(
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
    const shareLink = await prisma.shareLink.findUnique({ where: { token } });
    if (!shareLink || shareLink.ownerEmail !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Share link not found." }, { status: 404 });
    }

    await prisma.shareLink.update({
      where: { token },
      data: { status: "reviewed" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mark reviewed error:", error);
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}

/**
 * DELETE /api/share/[token] — Authenticated: author revokes a share link.
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
    const shareLink = await prisma.shareLink.findUnique({ where: { token } });
    if (!shareLink || shareLink.ownerEmail !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Share link not found." }, { status: 404 });
    }

    await prisma.shareLink.update({
      where: { token },
      data: { status: "revoked" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Revoke share link error:", error);
    return NextResponse.json({ error: "Failed to revoke share link." }, { status: 500 });
  }
}
