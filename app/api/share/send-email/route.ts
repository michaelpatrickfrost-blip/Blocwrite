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
    ? `<tr><td style="padding-bottom: 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #111111; border: 1px solid rgba(163,230,53,0.12); border-radius: 14px;">
          <tr><td style="padding: 18px 22px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="44" valign="top">
                  <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(163,230,53,0.06); border: 1px solid rgba(163,230,53,0.12); text-align: center; line-height: 36px; font-size: 16px;">&#128274;</div>
                </td>
                <td style="padding-left: 14px;">
                  <p style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #555; margin: 0 0 6px;">Your access password</p>
                  <p style="font-size: 20px; font-weight: 800; color: #a3e635; margin: 0; letter-spacing: 0.06em; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;">${rawPassword}</p>
                  <p style="font-size: 11px; color: #444; margin: 8px 0 0;">Enter this when prompted to open the manuscript</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>`
    : hasPassword
      ? `<tr><td style="padding-bottom: 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #111111; border: 1px solid #2a2828; border-radius: 14px;">
            <tr><td style="padding: 16px 22px; text-align: center;">
              <p style="font-size: 12px; color: #777; margin: 0;">&#128274; This manuscript is password protected &mdash; the author will provide the password separately.</p>
            </td></tr>
          </table>
        </td></tr>`
      : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #080808; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #080808; padding: 48px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom: 44px;">
          <a href="${appUrl}" style="text-decoration: none;">
            <img src="${appUrl}/blocwrite-logo-white.png" alt="Blocwrite" width="150" style="height: auto; display: block;" />
          </a>
        </td></tr>

        <!-- Main card -->
        <tr><td style="background: linear-gradient(180deg, #1c1a1a 0%, #151313 100%); border-radius: 24px; border: 1px solid #2a2828; overflow: hidden; box-shadow: 0 32px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02);">
          <!-- Premium accent bar -->
          <div style="height: 3px; background: linear-gradient(90deg, transparent 0%, #65a30d 15%, #a3e635 35%, #d9f99d 50%, #a3e635 65%, #65a30d 85%, transparent 100%);"></div>

          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 48px 44px 44px;">
            <!-- Invitation badge -->
            <tr><td align="center" style="padding-bottom: 28px;">
              <div style="display: inline-block; padding: 7px 20px; border-radius: 24px; background: rgba(163,230,53,0.05); border: 1px solid rgba(163,230,53,0.10);">
                <p style="font-size: 10px; color: #a3e635; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; margin: 0;">Manuscript Review Invitation</p>
              </div>
            </td></tr>

            <!-- Opening line -->
            <tr><td align="center" style="padding-bottom: 20px;">
              <p style="font-size: 15px; color: #888; margin: 0; line-height: 1.6; font-style: italic;">
                You&rsquo;ve been personally invited to review
              </p>
            </td></tr>

            <!-- Title -->
            <tr><td align="center" style="padding-bottom: 8px;">
              <h1 style="font-size: 28px; font-weight: 800; color: #f5f5f5; margin: 0; letter-spacing: -0.03em; line-height: 1.3;">
                &ldquo;${novelTitle}&rdquo;
              </h1>
            </td></tr>

            <!-- Chapter count -->
            <tr><td align="center" style="padding-bottom: 36px;">
              <p style="font-size: 14px; color: #666; margin: 0; line-height: 1.5;">
                ${chapterCount} chapter${chapterCount !== 1 ? "s" : ""} shared for your feedback
              </p>
            </td></tr>

            <!-- CTA Button -->
            <tr><td align="center" style="padding-bottom: 32px;">
              <a href="${shareUrl}" style="display: inline-block; padding: 17px 56px; background: linear-gradient(135deg, #a3e635, #84cc16); color: #0a0a0a; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 16px; letter-spacing: -0.01em; box-shadow: 0 6px 28px rgba(163,230,53,0.3), 0 2px 8px rgba(163,230,53,0.15);">
                Open Manuscript &rarr;
              </a>
            </td></tr>

            <!-- Password block -->
            ${passwordBlock}

            <!-- Divider -->
            <tr><td style="padding: 0 0 28px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent, #2a2a2a, transparent);"></div>
            </td></tr>

            <!-- How it works -->
            <tr><td>
              <p style="font-size: 10px; color: #444; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 18px;">How it works</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="36" valign="top" style="padding-right: 14px; padding-bottom: 16px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(163,230,53,0.06); border: 1px solid rgba(163,230,53,0.12); text-align: center; line-height: 28px; font-size: 12px; color: #a3e635; font-weight: 700;">1</div>
                  </td>
                  <td style="padding-bottom: 16px;">
                    <p style="font-size: 14px; color: #999; margin: 0; line-height: 1.5;"><strong style="color: #ccc;">Read</strong> &mdash; go through the manuscript at your own pace</p>
                  </td>
                </tr>
                <tr>
                  <td width="36" valign="top" style="padding-right: 14px; padding-bottom: 16px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(163,230,53,0.06); border: 1px solid rgba(163,230,53,0.12); text-align: center; line-height: 28px; font-size: 12px; color: #a3e635; font-weight: 700;">2</div>
                  </td>
                  <td style="padding-bottom: 16px;">
                    <p style="font-size: 14px; color: #999; margin: 0; line-height: 1.5;"><strong style="color: #ccc;">Annotate</strong> &mdash; highlight any text to leave comments or suggestions</p>
                  </td>
                </tr>
                <tr>
                  <td width="36" valign="top" style="padding-right: 14px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(163,230,53,0.06); border: 1px solid rgba(163,230,53,0.12); text-align: center; line-height: 28px; font-size: 12px; color: #a3e635; font-weight: 700;">3</div>
                  </td>
                  <td>
                    <p style="font-size: 14px; color: #999; margin: 0; line-height: 1.5;"><strong style="color: #ccc;">Submit</strong> &mdash; send your notes back to the author instantly</p>
                  </td>
                </tr>
              </table>
            </td></tr>

            <!-- Appreciation note -->
            <tr><td align="center" style="padding-top: 28px; padding-bottom: 4px;">
              <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.6; font-style: italic;">
                Your feedback matters. Every note you leave helps shape the final draft.
              </p>
            </td></tr>

            <!-- Expiry -->
            <tr><td align="center" style="padding-top: 20px;">
              <p style="font-size: 11px; color: #3a3a3a; margin: 0;">
                This invitation expires on <strong style="color: #666;">${expiryStr}</strong>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top: 36px;">
          <table cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <p style="font-size: 11px; color: #333; margin: 0 0 4px;">
                Sent via <a href="${appUrl}" style="color: #555; text-decoration: none; font-weight: 600;">Blocwrite</a>
              </p>
              <p style="font-size: 10px; color: #222; margin: 0;">
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
