import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/share/send-email
 * Body: { token: string; recipientEmail: string }
 * Sends the branded HTML invitation email for an existing share link.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = verifySessionToken(sessionToken);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { token?: string; recipientEmail?: string; password?: string };
  const { token, recipientEmail, password } = body;

  if (!token || !recipientEmail?.trim()) {
    return NextResponse.json({ error: "Token and recipient email are required." }, { status: 400 });
  }

  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // Verify the share link belongs to this user
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: { chapters: { select: { id: true } } },
  });

  if (!shareLink || shareLink.ownerEmail !== email.trim().toLowerCase()) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  if (shareLink.status === "revoked") {
    return NextResponse.json({ error: "This share link has been revoked." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://blocwrite.com";
  const shareUrl = `${appUrl.replace(/\/$/, "")}/share/${token}`;
  const expiryStr = shareLink.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const chapterCount = shareLink.chapters.length;
  const hasPassword = !!shareLink.passwordHash;

  // Read the novel title from the user's data
  let novelTitle = "Untitled Novel";
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const { createHash } = await import("crypto");
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "kickablur@icloud.com").trim().toLowerCase();
    const DATA_DIR = join(process.cwd(), "data");
    const userEmail = email.trim().toLowerCase();
    const dir = userEmail === ADMIN_EMAIL ? DATA_DIR : join(DATA_DIR, "users", createHash("sha256").update(userEmail).digest("hex").slice(0, 16));
    const raw = await readFile(join(dir, "novels.json"), "utf-8").catch(() => "[]");
    const novels = JSON.parse(raw) as Array<{ id: string; title?: string }>;
    const novel = novels.find((n) => n.id === shareLink.novelId);
    if (novel?.title) novelTitle = novel.title;
  } catch { /* fallback to "Untitled Novel" */ }

  // Build the branded HTML email
  const rawPassword = password?.trim() || undefined;
  const htmlEmail = buildEmailHtml(appUrl, shareUrl, novelTitle, chapterCount, hasPassword, expiryStr, rawPassword);
  const textEmail = `You've been invited to review ${chapterCount} chapter${chapterCount !== 1 ? "s" : ""} from "${novelTitle}" on Blocwrite.\n\nOpen the link to read, highlight, and leave notes:\n${shareUrl}\n\n${hasPassword && rawPassword ? `Password: ${rawPassword}\n\n` : hasPassword ? "You'll need a password to open it — the person who shared this will provide it.\n\n" : ""}This link expires on ${expiryStr}.`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = process.env.SMTP_PORT;
  const smtpFrom = process.env.SMTP_FROM || "noreply@blocwrite.com";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json({ error: "Email sending is not configured on this server." }, { status: 500 });
  }

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
      to: recipientEmail.trim().toLowerCase(),
      subject: `You've been invited to review "${novelTitle}" on Blocwrite`,
      text: textEmail,
      html: htmlEmail,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Share Send Email] Failed:", err);
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
  }
}

function buildEmailHtml(
  appUrl: string, shareUrl: string, novelTitle: string,
  chapterCount: number, hasPassword: boolean, expiryStr: string,
  rawPassword?: string,
): string {
  const passwordBlock = hasPassword && rawPassword
    ? `<tr><td style="padding-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #161414; border: 1px solid #3a3a3a; border-radius: 12px;">
          <tr><td style="padding: 16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" valign="top">
                  <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(163,230,53,0.08); border: 1px solid rgba(163,230,53,0.15); text-align: center; line-height: 28px; font-size: 14px;">&#128274;</div>
                </td>
                <td style="padding-left: 12px;">
                  <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin: 0 0 6px;">Your access password</p>
                  <p style="font-size: 18px; font-weight: 700; color: #a3e635; margin: 0; letter-spacing: 0.05em; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;">${rawPassword}</p>
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

  return `<!DOCTYPE html>
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
          <div style="height: 4px; background: linear-gradient(90deg, #84cc16, #a3e635, #d9f99d, #a3e635, #84cc16);"></div>

          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 44px 40px 40px;">
            <!-- Invitation badge -->
            <tr><td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; padding: 6px 18px; border-radius: 20px; background: rgba(163,230,53,0.06); border: 1px solid rgba(163,230,53,0.12);">
                <p style="font-size: 10px; color: #a3e635; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; margin: 0;">Manuscript Review Invitation</p>
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
              <a href="${shareUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #a3e635, #84cc16); color: #0a0a0a; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px; letter-spacing: -0.01em; box-shadow: 0 4px 20px rgba(163,230,53,0.25);">
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
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(163,230,53,0.08); border: 1px solid rgba(163,230,53,0.15); text-align: center; line-height: 24px; font-size: 11px; color: #a3e635; font-weight: 700;">1</div>
                  </td>
                  <td style="padding-bottom: 12px;">
                    <p style="font-size: 13px; color: #999; margin: 0; line-height: 1.5;"><strong style="color: #bbb;">Read</strong> &mdash; go through the manuscript at your own pace</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="padding-right: 12px; padding-bottom: 12px;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(163,230,53,0.08); border: 1px solid rgba(163,230,53,0.15); text-align: center; line-height: 24px; font-size: 11px; color: #a3e635; font-weight: 700;">2</div>
                  </td>
                  <td style="padding-bottom: 12px;">
                    <p style="font-size: 13px; color: #999; margin: 0; line-height: 1.5;"><strong style="color: #bbb;">Annotate</strong> &mdash; highlight text to leave comments, suggestions, or flag issues</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="padding-right: 12px;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(163,230,53,0.08); border: 1px solid rgba(163,230,53,0.15); text-align: center; line-height: 24px; font-size: 11px; color: #a3e635; font-weight: 700;">3</div>
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
}
