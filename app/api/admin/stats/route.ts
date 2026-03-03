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
    const [totalUserCount, guestCount, stripeCustomers, activeOrTrialSubs] = await Promise.all([
      prisma.user.count(),
      prisma.guestAccess.count(),
      prisma.stripeCustomer.findMany({
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.subscription.findMany({
        where: { status: { in: ["active", "trialing"] } },
        select: { userId: true, status: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Stripe-linked signups by month (source of truth for paid/trial funnel)
    const activeUserIds = new Set<string>();
    const trialUserIds = new Set<string>();
    const seenUsers = new Set<string>();
    for (const row of activeOrTrialSubs) {
      const userId = row.userId;
      if (!userId || seenUsers.has(userId)) continue;
      seenUsers.add(userId);
      if (row.status === "active") activeUserIds.add(userId);
      else if (row.status === "trialing") trialUserIds.add(userId);
    }
    const activeSubCount = activeUserIds.size;
    const trialSubCount = [...trialUserIds].filter((userId) => !activeUserIds.has(userId)).length;

    // Keep `userCount` stripe-linked so admin dashboard ties to Stripe data.
    const userCount = new Set(stripeCustomers.map((c) => c.userId)).size;

    const signupsByMonth: Record<string, number> = {};
    for (const customer of stripeCustomers) {
      const key = `${customer.createdAt.getFullYear()}-${String(customer.createdAt.getMonth() + 1).padStart(2, "0")}`;
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
      totalUserCount,
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
