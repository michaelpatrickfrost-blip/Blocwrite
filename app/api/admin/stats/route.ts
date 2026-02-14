import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), "data");

/**
 * Count words in a string (simple whitespace split).
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Extract word count from a chapter's content (handles bloc format).
 */
function chapterWordCount(content: string): number {
  if (!content) return 0;
  // Handle <<<BLOCK>>> format
  if (content.includes("<<<BLOCK>>>")) {
    const parts = content.split("<<<BLOCK>>>").filter(Boolean);
    let total = 0;
    for (const part of parts) {
      const proseIdx = part.indexOf("<<<PROSE>>>");
      const endIdx = part.indexOf("<<<ENDBLOCK>>>");
      if (proseIdx !== -1 && endIdx !== -1) {
        total += countWords(part.slice(proseIdx + "<<<PROSE>>>".length, endIdx));
      }
    }
    return total;
  }
  return countWords(content);
}

/**
 * GET /api/admin/stats
 * Platform analytics: users, novels, words, genres, etc.
 */
export async function GET() {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // ── DB stats ──
    const [userCount, activeSubCount, trialSubCount, guestCount] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.subscription.count({ where: { status: "trialing" } }),
      prisma.guestAccess.count(),
    ]);

    // User signups by month (last 12 months)
    const users = await prisma.user.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const signupsByMonth: Record<string, number> = {};
    for (const u of users) {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}`;
      signupsByMonth[key] = (signupsByMonth[key] || 0) + 1;
    }

    // ── Novel file stats ──
    let totalNovels = 0;
    let totalWords = 0;
    let archivedNovels = 0;
    const genreCounts: Record<string, number> = {};
    const userNovelCounts: { email: string; count: number }[] = [];

    // Scan admin data dir
    try {
      const adminRaw = await readFile(join(DATA_DIR, "novels.json"), "utf-8").catch(() => "[]");
      const adminNovels = JSON.parse(adminRaw) as Array<Record<string, unknown>>;
      processNovels(adminNovels, "admin");
    } catch { /* no admin data */ }

    // Scan user data dirs
    const usersDir = join(DATA_DIR, "users");
    try {
      const userDirs = await readdir(usersDir);
      for (const dir of userDirs) {
        try {
          const raw = await readFile(join(usersDir, dir, "novels.json"), "utf-8");
          const novels = JSON.parse(raw) as Array<Record<string, unknown>>;
          processNovels(novels, dir);
        } catch { /* skip unreadable */ }
      }
    } catch { /* no users dir yet */ }

    function processNovels(novels: Array<Record<string, unknown>>, userKey: string) {
      if (!Array.isArray(novels)) return;
      let userWordCount = 0;
      let userNovelCount = 0;

      for (const novel of novels) {
        totalNovels++;
        userNovelCount++;

        if (novel.archived) archivedNovels++;

        // Genres
        const bible = novel.storyBible as Record<string, unknown> | undefined;
        const summary = bible?.summary as Record<string, unknown> | undefined;
        const genres = summary?.genre;
        if (Array.isArray(genres)) {
          for (const g of genres) {
            if (typeof g === "string" && g.trim()) {
              const gNorm = g.trim();
              genreCounts[gNorm] = (genreCounts[gNorm] || 0) + 1;
            }
          }
        }

        // Word count from chapters
        const chapters = novel.chapters;
        if (Array.isArray(chapters)) {
          for (const ch of chapters) {
            const content = (ch as Record<string, unknown>)?.content;
            if (typeof content === "string") {
              const wc = chapterWordCount(content);
              totalWords += wc;
              userWordCount += wc;
            }
          }
        }
      }

      if (userNovelCount > 0) {
        userNovelCounts.push({ email: userKey, count: userNovelCount });
      }
    }

    // Sort genres by count desc
    const genreBreakdown = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([genre, count]) => ({ genre, count }));

    // Sort users by novel count desc
    const topUsers = userNovelCounts.sort((a, b) => b.count - a.count).slice(0, 10);

    return NextResponse.json({
      userCount,
      activeSubCount,
      trialSubCount,
      guestCount,
      totalNovels,
      totalWords,
      archivedNovels,
      activeNovels: totalNovels - archivedNovels,
      genreBreakdown,
      topUsers,
      signupsByMonth,
      avgNovelsPerUser: userNovelCounts.length > 0
        ? Math.round((totalNovels / userNovelCounts.length) * 10) / 10
        : 0,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
