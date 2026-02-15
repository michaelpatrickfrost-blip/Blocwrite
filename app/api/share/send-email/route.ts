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

  const body = (await request.json()) as { token?: string; recipientEmail?: string };
  const { token, recipientEmail } = body;

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
  const htmlEmail = buildEmailHtml(appUrl, shareUrl, novelTitle, chapterCount, hasPassword, expiryStr);
  const textEmail = `You've been invited to review ${chapterCount} chapter${chapterCount !== 1 ? "s" : ""} from "${novelTitle}" on Blocwrite.\n\nOpen the link to read, highlight, and leave notes:\n${shareUrl}\n\n${hasPassword ? "You'll need a password to open it — the person who shared this will provide it.\n\n" : ""}This link expires on ${expiryStr}.`;

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
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #111; padding: 40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%;">
        <tr><td align="center" style="padding-bottom: 32px;">
          <img src="${appUrl}/blocwrite-logo-white.png" alt="Blocwrite" width="120" style="height: auto; display: block;" />
        </td></tr>
        <tr><td style="background: #1e1c1c; border-radius: 16px; border: 1px solid #333; overflow: hidden;">
          <div style="height: 3px; background: linear-gradient(90deg, #a3e635, #65a30d);"></div>
          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 36px 32px 32px;">
            <tr><td align="center" style="padding-bottom: 8px;">
              <p style="font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin: 0;">You&rsquo;ve been invited to review</p>
            </td></tr>
            <tr><td align="center" style="padding-bottom: 6px;">
              <h1 style="font-size: 22px; font-weight: 700; color: #f0f0f0; margin: 0; letter-spacing: -0.02em; line-height: 1.3;">&ldquo;${novelTitle}&rdquo;</h1>
            </td></tr>
            <tr><td align="center" style="padding-bottom: 28px;">
              <p style="font-size: 14px; color: #888; margin: 0; line-height: 1.5;">${chapterCount} chapter${chapterCount !== 1 ? "s" : ""} shared for your feedback</p>
            </td></tr>
            <tr><td align="center" style="padding-bottom: 24px;">
              <a href="${shareUrl}" style="display: inline-block; padding: 14px 40px; background: #a3e635; color: #111; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; letter-spacing: -0.01em;">Open Manuscript</a>
            </td></tr>
            ${hasPassword ? `<tr><td align="center" style="padding-bottom: 16px;"><div style="display: inline-block; padding: 8px 16px; background: rgba(255,255,255,0.04); border: 1px solid #333; border-radius: 8px;"><p style="font-size: 12px; color: #888; margin: 0;">&#128274; Password protected &mdash; the sender will provide it separately.</p></div></td></tr>` : ""}
            <tr><td style="padding: 0 0 20px;"><div style="height: 1px; background: #333;"></div></td></tr>
            <tr><td>
              <p style="font-size: 12px; color: #666; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px;">How it works</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td width="24" valign="top" style="padding-right: 10px; padding-bottom: 8px;"><div style="width: 20px; height: 20px; border-radius: 50%; background: rgba(163,230,53,0.1); border: 1px solid rgba(163,230,53,0.2); text-align: center; line-height: 20px; font-size: 10px; color: #a3e635; font-weight: 700;">1</div></td><td style="padding-bottom: 8px;"><p style="font-size: 13px; color: #aaa; margin: 0; line-height: 1.5;">Read through the manuscript at your own pace</p></td></tr>
                <tr><td width="24" valign="top" style="padding-right: 10px; padding-bottom: 8px;"><div style="width: 20px; height: 20px; border-radius: 50%; background: rgba(163,230,53,0.1); border: 1px solid rgba(163,230,53,0.2); text-align: center; line-height: 20px; font-size: 10px; color: #a3e635; font-weight: 700;">2</div></td><td style="padding-bottom: 8px;"><p style="font-size: 13px; color: #aaa; margin: 0; line-height: 1.5;">Highlight text to leave comments, suggestions, or flag issues</p></td></tr>
                <tr><td width="24" valign="top" style="padding-right: 10px;"><div style="width: 20px; height: 20px; border-radius: 50%; background: rgba(163,230,53,0.1); border: 1px solid rgba(163,230,53,0.2); text-align: center; line-height: 20px; font-size: 10px; color: #a3e635; font-weight: 700;">3</div></td><td><p style="font-size: 13px; color: #aaa; margin: 0; line-height: 1.5;">Submit your notes &mdash; the author gets them instantly</p></td></tr>
              </table>
            </td></tr>
            <tr><td align="center" style="padding-top: 20px;">
              <p style="font-size: 11px; color: #555; margin: 0;">This link expires on <strong style="color: #888;">${expiryStr}</strong></p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top: 28px;">
          <p style="font-size: 11px; color: #444; margin: 0;">Sent via <a href="${appUrl}" style="color: #666; text-decoration: none;">Blocwrite</a> &mdash; the AI writing studio</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
