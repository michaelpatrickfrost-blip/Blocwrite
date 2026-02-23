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
  rawPassword?: string,
) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = process.env.SMTP_PORT;
  const smtpFrom = process.env.SMTP_FROM || "noreply@blocwrite.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://blocwrite.com";

  const expiryStr = expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const passwordBlock = hasPassword && rawPassword
    ? `<tr><td style="padding-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #161414; border: 1px solid #3a3a3a; border-radius: 12px;">
          <tr><td style="padding: 16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" valign="top">
                  <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(124,92,252,0.08); border: 1px solid rgba(124,92,252,0.15); text-align: center; line-height: 28px; font-size: 14px;">&#128274;</div>
                </td>
                <td style="padding-left: 12px;">
                  <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin: 0 0 6px;">Your access password</p>
                  <p style="font-size: 18px; font-weight: 700; color: #b8a4ff; margin: 0; letter-spacing: 0.05em; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;">${rawPassword}</p>
                  <p style="font-size: 11px; color: #555; margin: 6px 0 0;">Enter this when prompted to access the manuscript</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>`
    : hasPassword
      ? `<tr><td style="padding-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #161414; border: 1px solid #3a3a3a; border-radius: 12px;">
            <tr><td style="padding: 14px 20px; text-align: center;">
              <p style="font-size: 12px; color: #888; margin: 0;">&#128274; This manuscript is password protected &mdash; the author will provide the password separately.</p>
            </td></tr>
          </table>
        </td></tr>`
      : "";

  const htmlEmail = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a; padding: 48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom: 40px;">
          <a href="${appUrl}" style="text-decoration: none;">
            <img src="${appUrl}/blocwrite-logo-white.png" alt="Blocwrite" width="140" style="height: auto; display: block;" />
          </a>
        </td></tr>

        <!-- Main card -->
        <tr><td style="background: #1a1818; border-radius: 20px; border: 1px solid #2a2828; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.4);">
          <!-- Premium accent bar -->
          <div style="height: 4px; background: linear-gradient(90deg, #6246ea, #b8a4ff, #d4c8ff, #b8a4ff, #6246ea);"></div>

          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 44px 40px 40px;">
            <!-- Invitation badge -->
            <tr><td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; padding: 6px 18px; border-radius: 20px; background: rgba(124,92,252,0.06); border: 1px solid rgba(124,92,252,0.12);">
                <p style="font-size: 10px; color: #b8a4ff; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; margin: 0;">Manuscript Review Invitation</p>
              </div>
            </td></tr>

            <!-- Title -->
            <tr><td align="center" style="padding-bottom: 8px;">
              <h1 style="font-size: 26px; font-weight: 800; color: #f5f5f5; margin: 0; letter-spacing: -0.03em; line-height: 1.25;">
                &ldquo;${novelTitle}&rdquo;
              </h1>
            </td></tr>

            <!-- Chapter count -->
            <tr><td align="center" style="padding-bottom: 32px;">
              <p style="font-size: 14px; color: #777; margin: 0; line-height: 1.5;">
                ${chapterCount} chapter${chapterCount !== 1 ? "s" : ""} shared for your feedback
              </p>
            </td></tr>

            <!-- CTA Button -->
            <tr><td align="center" style="padding-bottom: 28px;">
              <a href="${shareUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #b8a4ff, #6246ea); color: #ffffff; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: -0.01em; box-shadow: 0 4px 20px rgba(124,92,252,0.25);">
                Open Manuscript &rarr;
              </a>
            </td></tr>

            <!-- Password block -->
            ${passwordBlock}

            <!-- Divider -->
            <tr><td style="padding: 0 0 24px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent, #333, transparent);"></div>
            </td></tr>

            <!-- How it works -->
            <tr><td>
              <p style="font-size: 11px; color: #555; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 16px;">How it works</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="32" valign="top" style="padding-right: 12px; padding-bottom: 12px;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(124,92,252,0.08); border: 1px solid rgba(124,92,252,0.15); text-align: center; line-height: 24px; font-size: 11px; color: #b8a4ff; font-weight: 700;">1</div>
                  </td>
                  <td style="padding-bottom: 12px;">
                    <p style="font-size: 13px; color: #999; margin: 0; line-height: 1.5;"><strong style="color: #bbb;">Read</strong> &mdash; go through the manuscript at your own pace</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="padding-right: 12px; padding-bottom: 12px;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(124,92,252,0.08); border: 1px solid rgba(124,92,252,0.15); text-align: center; line-height: 24px; font-size: 11px; color: #b8a4ff; font-weight: 700;">2</div>
                  </td>
                  <td style="padding-bottom: 12px;">
                    <p style="font-size: 13px; color: #999; margin: 0; line-height: 1.5;"><strong style="color: #bbb;">Annotate</strong> &mdash; highlight text to leave comments, suggestions, or flag issues</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="padding-right: 12px;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(124,92,252,0.08); border: 1px solid rgba(124,92,252,0.15); text-align: center; line-height: 24px; font-size: 11px; color: #b8a4ff; font-weight: 700;">3</div>
                  </td>
                  <td>
                    <p style="font-size: 13px; color: #999; margin: 0; line-height: 1.5;"><strong style="color: #bbb;">Submit</strong> &mdash; send your notes back to the author instantly</p>
                  </td>
                </tr>
              </table>
            </td></tr>

            <!-- Expiry -->
            <tr><td align="center" style="padding-top: 24px;">
              <p style="font-size: 11px; color: #444; margin: 0;">
                This link expires on <strong style="color: #777;">${expiryStr}</strong>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top: 32px;">
          <table cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <p style="font-size: 11px; color: #3a3a3a; margin: 0 0 6px;">
                Sent via <a href="${appUrl}" style="color: #555; text-decoration: none; font-weight: 600;">Blocwrite</a>
              </p>
              <p style="font-size: 10px; color: #2a2a2a; margin: 0;">
                The AI writing studio for novelists
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textEmail = `You've been invited to review ${chapterCount} chapter${chapterCount !== 1 ? "s" : ""} from "${novelTitle}" on Blocwrite.\n\nOpen the link to read, highlight, and leave notes:\n${shareUrl}\n\n${hasPassword && rawPassword ? `Password: ${rawPassword}\n\n` : hasPassword ? "You'll need a password to open it — the person who shared this will provide it.\n\n" : ""}This link expires on ${expiryStr}.`;

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
        password?.trim() || undefined,
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
