import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/forgot-password
 * Generates a password-reset token and emails it (or logs it if SMTP not configured).
 * Always returns success to avoid email enumeration.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Always respond with success (prevents email enumeration)
    const successResponse = {
      ok: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    };

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      // Don't reveal that the user doesn't exist
      return NextResponse.json(successResponse);
    }

    // Delete any existing reset tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Generate a secure token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const textContent = `You requested a password reset.\n\nClick this link to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`;
    const htmlContent = `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
        <h2 style="font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px;">Reset your password</h2>
        <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 24px;">
          You requested a password reset for your Blocwrite account. Click the button below to set a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 28px; background: #7c5cfc; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Reset Password
        </a>
        <p style="font-size: 12px; color: #999; margin-top: 28px; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request a reset, ignore this email.
        </p>
      </div>
    `;

    let emailSent = false;

    // 1) Try Resend (simple API key; good deliverability)
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);
        const from = process.env.RESEND_FROM || process.env.SMTP_FROM || "Blocwrite <onboarding@resend.dev>";
        const { error } = await resend.emails.send({
          from: from.includes("<") ? from : `Blocwrite <${from}>`,
          to: email,
          subject: "Reset your Blocwrite password",
          text: textContent,
          html: htmlContent,
        });
        if (error) throw new Error(String(error));
        emailSent = true;
        console.log(`[Password Reset] Email sent via Resend to ${email}`);
      } catch (resendErr) {
        console.error("[Password Reset] Resend failed:", resendErr);
      }
    }

    // 2) Fall back to SMTP
    if (!emailSent) {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || "noreply@blocwrite.com";

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
            to: email,
            subject: "Reset your Blocwrite password",
            text: textContent,
            html: htmlContent,
          });
          emailSent = true;
          console.log(`[Password Reset] Email sent via SMTP to ${email}`);
        } catch (emailErr) {
          console.error("[Password Reset] SMTP failed:", emailErr);
        }
      }
    }

    if (!emailSent) {
      console.log(`[Password Reset] No email sent (no RESEND_API_KEY or SMTP). URL for ${email}: ${resetUrl}`);
    }

    return NextResponse.json(successResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
