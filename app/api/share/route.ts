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

  const htmlEmail = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #111; padding: 40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%;">
        <!-- Logo -->
        <tr><td align="center" style="padding-bottom: 32px;">
          <img src="${appUrl}/blocwrite-logo-white.png" alt="Blocwrite" width="120" style="height: auto; display: block;" />
        </td></tr>

        <!-- Card -->
        <tr><td style="background: #1e1c1c; border-radius: 16px; border: 1px solid #333; overflow: hidden;">
          <!-- Accent bar -->
          <div style="height: 3px; background: linear-gradient(90deg, #a3e635, #65a30d);"></div>

          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 36px 32px 32px;">
            <tr><td align="center" style="padding-bottom: 8px;">
              <p style="font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin: 0;">
                You&rsquo;ve been invited to review
              </p>
            </td></tr>

            <tr><td align="center" style="padding-bottom: 6px;">
              <h1 style="font-size: 22px; font-weight: 700; color: #f0f0f0; margin: 0; letter-spacing: -0.02em; line-height: 1.3;">
                &ldquo;${novelTitle}&rdquo;
              </h1>
            </td></tr>

            <tr><td align="center" style="padding-bottom: 28px;">
              <p style="font-size: 14px; color: #888; margin: 0; line-height: 1.5;">
                ${chapterCount} chapter${chapterCount !== 1 ? "s" : ""} shared for your feedback
              </p>
            </td></tr>

            <!-- CTA Button -->
            <tr><td align="center" style="padding-bottom: 24px;">
              <a href="${shareUrl}" style="display: inline-block; padding: 14px 40px; background: #a3e635; color: #111; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; letter-spacing: -0.01em;">
                Open Manuscript
              </a>
            </td></tr>

            ${hasPassword ? `<tr><td align="center" style="padding-bottom: 16px;">
              <div style="display: inline-block; padding: 8px 16px; background: rgba(255,255,255,0.04); border: 1px solid #333; border-radius: 8px;">
                <p style="font-size: 12px; color: #888; margin: 0;">&#128274; Password protected &mdash; the sender will provide it separately.</p>
              </div>
            </td></tr>` : ""}

            <!-- Divider -->
            <tr><td style="padding: 0 0 20px;">
              <div style="height: 1px; background: #333;"></div>
            </td></tr>

            <!-- How it works -->
            <tr><td>
              <p style="font-size: 12px; color: #666; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px;">How it works</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="24" valign="top" style="padding-right: 10px; padding-bottom: 8px;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: rgba(163,230,53,0.1); border: 1px solid rgba(163,230,53,0.2); text-align: center; line-height: 20px; font-size: 10px; color: #a3e635; font-weight: 700;">1</div>
                  </td>
                  <td style="padding-bottom: 8px;"><p style="font-size: 13px; color: #aaa; margin: 0; line-height: 1.5;">Read through the manuscript at your own pace</p></td>
                </tr>
                <tr>
                  <td width="24" valign="top" style="padding-right: 10px; padding-bottom: 8px;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: rgba(163,230,53,0.1); border: 1px solid rgba(163,230,53,0.2); text-align: center; line-height: 20px; font-size: 10px; color: #a3e635; font-weight: 700;">2</div>
                  </td>
                  <td style="padding-bottom: 8px;"><p style="font-size: 13px; color: #aaa; margin: 0; line-height: 1.5;">Highlight text to leave comments, suggestions, or flag issues</p></td>
                </tr>
                <tr>
                  <td width="24" valign="top" style="padding-right: 10px;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: rgba(163,230,53,0.1); border: 1px solid rgba(163,230,53,0.2); text-align: center; line-height: 20px; font-size: 10px; color: #a3e635; font-weight: 700;">3</div>
                  </td>
                  <td><p style="font-size: 13px; color: #aaa; margin: 0; line-height: 1.5;">Submit your notes &mdash; the author gets them instantly</p></td>
                </tr>
              </table>
            </td></tr>

            <tr><td align="center" style="padding-top: 20px;">
              <p style="font-size: 11px; color: #555; margin: 0;">
                This link expires on <strong style="color: #888;">${expiryStr}</strong>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top: 28px;">
          <p style="font-size: 11px; color: #444; margin: 0;">
            Sent via <a href="${appUrl}" style="color: #666; text-decoration: none;">Blocwrite</a> &mdash; the AI writing studio
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
