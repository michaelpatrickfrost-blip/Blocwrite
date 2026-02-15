import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile } from "fs/promises";
import { join } from "path";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), "data");

const BLOCK_DELIM = "<<<BLOCK>>>";
const PROSE_DELIM = "<<<PROSE>>>";
const END_BLOCK = "<<<ENDBLOCK>>>";

/** Extract only the prose from chapter content, stripping bloc structure. */
function extractProse(content: string): string {
  if (!content.includes(BLOCK_DELIM)) {
    return content
      .replace(/<<<BLOCK>>>/g, "").replace(/<<<PROSE>>>/g, "")
      .replace(/<<<ENDBLOCK>>>/g, "").replace(/<<<META>>>/g, "")
      .replace(/<<<SYNOPSIS>>>/g, "").trim() || "(No content yet)";
  }
  const parts = content.split(BLOCK_DELIM).filter(Boolean);
  const proseChunks: string[] = [];
  for (const part of parts) {
    const proseIdx = part.indexOf(PROSE_DELIM);
    const endIdx = part.indexOf(END_BLOCK);
    if (proseIdx === -1 || endIdx === -1) continue;
    const prose = part.slice(proseIdx + PROSE_DELIM.length, endIdx).replace(/^\n+/, "").replace(/\n+$/, "").trim();
    if (prose) proseChunks.push(prose);
  }
  return proseChunks.join("\n\n\n") || "(No content yet)";
}

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "kickablur@icloud.com").trim().toLowerCase();

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

/** Send a branded share invitation email. Falls back to console.log if SMTP not configured. */
async function sendShareEmail(
  recipientEmail: string,
  shareUrl: string,
  expiresAt: Date,
  chapterCount: number,
  novelTitle: string,
  hasPassword: boolean,
) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = process.env.SMTP_PORT;
  const smtpFrom = process.env.SMTP_FROM || "noreply@blocwrite.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://blocwrite.com";

  const expiryStr = expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const passwordNote = hasPassword ? "You'll need a password to open it — the person who shared this will provide it." : "";

  const htmlEmail = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 0;">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="${appUrl}/blocwrite-logo-white.png" alt="Blocwrite" style="height: 28px; width: auto;" />
      </div>
      <div style="background: #1a1a1a; border-radius: 16px; padding: 32px; color: #e5e7eb;">
        <h2 style="font-size: 20px; font-weight: 700; color: #f9fafb; margin: 0 0 12px; text-align: center;">
          You've been invited to review
        </h2>
        <p style="font-size: 15px; color: #9ca3af; text-align: center; margin: 0 0 24px; line-height: 1.6;">
          ${chapterCount} chapter${chapterCount !== 1 ? "s" : ""} from <strong style="color: #f9fafb;">${novelTitle}</strong> are waiting for your feedback.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${shareUrl}" style="display: inline-block; padding: 14px 36px; background: #3b82f6; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
            Open &amp; Review
          </a>
        </div>
        ${passwordNote ? `<p style="font-size: 13px; color: #6b7280; text-align: center; margin: 0 0 16px;">🔒 ${passwordNote}</p>` : ""}
        <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0; line-height: 1.5;">
          Select text to highlight it, add notes, and submit your feedback.<br/>
          This link expires on ${expiryStr}.
        </p>
      </div>
      <p style="font-size: 11px; color: #4b5563; text-align: center; margin-top: 24px;">
        Sent via <a href="${appUrl}" style="color: #6b7280;">Blocwrite</a>
      </p>
    </div>
  `;

  const textEmail = `You've been invited to review ${chapterCount} chapter${chapterCount !== 1 ? "s" : ""} from "${novelTitle}" on Blocwrite.\n\nOpen the link to read, highlight, and leave notes:\n${shareUrl}\n\n${passwordNote}\n\nThis link expires on ${expiryStr}.`;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || "587", 10),
        secure: smtpPort === "465",
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"Blocwrite" <${smtpFrom}>`,
        to: recipientEmail,
        subject: `You've been invited to review "${novelTitle}" on Blocwrite`,
        text: textEmail,
        html: htmlEmail,
      });
      console.log(`[Share] Email sent to ${recipientEmail}`);
      return true;
    } catch (err) {
      console.error("[Share] Failed to send email:", err);
      console.log(`[Share] Fallback URL for ${recipientEmail}: ${shareUrl}`);
      return false;
    }
  } else {
    console.log(`[Share] No SMTP configured. Share URL for ${recipientEmail}: ${shareUrl}`);
    return false;
  }
}

/**
 * POST /api/share — Create a share link for selected chapters
 * Body: { novelId, chapterIds, password?, recipientEmail?, expiryDays?, novelTitle? }
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
      password?: string;
      recipientEmail?: string;
      expiryDays?: number;
      novelTitle?: string;
    };

    const { novelId, chapterIds, password, recipientEmail, novelTitle } = body;
    const expiryDays = Math.max(1, Math.min(30, body.expiryDays ?? 7));

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
      title?: string;
      chapters?: Array<{ id: string; title: string; content?: string }>;
    }>;

    const novel = novels.find((n) => n.id === novelId);
    if (!novel) {
      return NextResponse.json({ error: "Novel not found." }, { status: 404 });
    }

    const chapters = novel.chapters ?? [];
    const selectedChapters = chapters
      .filter((ch) => chapterIds.includes(ch.id))
      .map((ch, idx) => ({
        chapterTitle: ch.title || `Chapter ${idx + 1}`,
        chapterContent: extractProse(ch.content || ""),
        order: idx,
      }));

    if (selectedChapters.length === 0) {
      return NextResponse.json({ error: "No matching chapters found." }, { status: 400 });
    }

    // Hash password if provided
    const passwordHash = password?.trim() ? await bcrypt.hash(password.trim(), 10) : undefined;

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        novelId,
        ownerEmail: email,
        expiresAt,
        expiryDays,
        passwordHash: passwordHash || null,
        recipientEmail: recipientEmail?.trim().toLowerCase() || null,
        status: "active",
        chapters: { create: selectedChapters },
      },
    });

    // Build URL — use env variable to prevent header spoofing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || `https://${request.headers.get("host") || "blocwrite.com"}`;
    const shareUrl = `${appUrl.replace(/\/$/, "")}/share/${token}`;

    // Send email if recipient provided
    let emailSent = false;
    if (recipientEmail?.trim()) {
      emailSent = await sendShareEmail(
        recipientEmail.trim().toLowerCase(),
        shareUrl,
        expiresAt,
        selectedChapters.length,
        novelTitle || novel.title || "Untitled Novel",
        !!passwordHash,
      );
    }

    return NextResponse.json({
      token: shareLink.token,
      url: shareUrl,
      expiresAt: shareLink.expiresAt.toISOString(),
      emailSent,
      hasPassword: !!passwordHash,
    });
  } catch (error) {
    console.error("Share link creation error:", error);
    return NextResponse.json({ error: "Failed to create share link." }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to fetch share links." }, { status: 500 });
  }
}
