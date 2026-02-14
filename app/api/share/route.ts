import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile } from "fs/promises";
import { join } from "path";
import { createHash, randomBytes } from "crypto";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), "data");
const ADMIN_EMAIL = "kickablur@icloud.com";

async function getAuthEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const email = verifySessionToken(token);
  return email ? email.trim().toLowerCase() : null;
}

function getUserDataDir(email: string): string {
  if (email === ADMIN_EMAIL) return DATA_DIR;
  const hash = createHash("sha256").update(email).digest("hex").slice(0, 16);
  return join(DATA_DIR, "users", hash);
}

/**
 * POST /api/share — Create a share link for selected chapters
 * Body: { novelId, chapterIds: string[] }
 * Returns: { token, url, expiresAt }
 */
export async function POST(request: Request) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      novelId?: string;
      chapterIds?: string[];
    };

    const { novelId, chapterIds } = body;
    if (!novelId || !chapterIds || chapterIds.length === 0) {
      return NextResponse.json(
        { error: "novelId and at least one chapterId are required." },
        { status: 400 },
      );
    }

    // Read the user's novels data
    const dir = getUserDataDir(email);
    const raw = await readFile(join(dir, "novels.json"), "utf-8").catch(() => "[]");
    const novels = JSON.parse(raw) as Array<{
      id: string;
      chapters?: Array<{
        id: string;
        title: string;
        content?: string;
      }>;
    }>;

    const novel = novels.find((n) => n.id === novelId);
    if (!novel) {
      return NextResponse.json({ error: "Novel not found." }, { status: 404 });
    }

    const chapters = novel.chapters ?? [];
    const selectedChapters = chapters
      .filter((ch) => chapterIds.includes(ch.id))
      .map((ch, idx) => {
        return {
          chapterTitle: ch.title || `Chapter ${idx + 1}`,
          chapterContent: ch.content || "(No content yet)",
          order: idx,
        };
      });

    if (selectedChapters.length === 0) {
      return NextResponse.json(
        { error: "No matching chapters found." },
        { status: 400 },
      );
    }

    // Generate a crypto-random token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create the share link and chapters in one transaction
    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        novelId,
        ownerEmail: email,
        expiresAt,
        status: "active",
        chapters: {
          create: selectedChapters,
        },
      },
    });

    // Build the URL from the request origin
    const origin = request.headers.get("origin") || request.headers.get("host") || "";
    const protocol = origin.startsWith("http") ? "" : "https://";
    const shareUrl = `${protocol}${origin}/share/${token}`;

    return NextResponse.json({
      token: shareLink.token,
      url: shareUrl,
      expiresAt: shareLink.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Share link creation error:", error);
    return NextResponse.json(
      { error: "Failed to create share link." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/share — List all share links for the authenticated user
 */
export async function GET() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const links = await prisma.shareLink.findMany({
      where: { ownerEmail: email },
      orderBy: { createdAt: "desc" },
      include: {
        chapters: {
          select: { id: true, chapterTitle: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("Fetch share links error:", error);
    return NextResponse.json(
      { error: "Failed to fetch share links." },
      { status: 500 },
    );
  }
}
