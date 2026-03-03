import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), "data");
const MESSAGES_FILE = join(DATA_DIR, "contact-messages.json");
const CONTACT_TO_EMAIL = "customerservice@blocwrite.com";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      email?: string;
      message?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const name = (typeof body.name === "string" ? body.name.trim() : "").slice(0, 200);
    const email = (typeof body.email === "string" ? body.email.trim() : "").slice(0, 200);
    const message = (typeof body.message === "string" ? body.message.trim() : "").slice(0, 5000);

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are all required." }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Store message to file
    await mkdir(DATA_DIR, { recursive: true });
    let messages: ContactMessage[] = [];
    try {
      const raw = await readFile(MESSAGES_FILE, "utf-8");
      messages = JSON.parse(raw) as ContactMessage[];
    } catch {
      // File doesn't exist yet
    }

    const newMessage: ContactMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      email,
      message,
      createdAt: new Date().toISOString(),
    };
    messages.push(newMessage);
    await writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf-8");

    // Try to send contact email to support inbox.
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || "noreply@blocwrite.com";
    let emailSent = false;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort || "587", 10),
          secure: smtpPort === "465",
          auth: { user: smtpUser, pass: smtpPass },
        });

        const subject = `New Contact Form Message - ${name}`;
        const text = [
          "A new contact form message was received.",
          "",
          `From: ${name} <${email}>`,
          `Date: ${newMessage.createdAt}`,
          "",
          "Message:",
          message,
        ].join("\n");

        await transporter.sendMail({
          from: `"Blocwrite Contact" <${smtpFrom}>`,
          to: CONTACT_TO_EMAIL,
          replyTo: email,
          subject,
          text,
          html: `
            <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px 0;">
              <h2 style="font-size: 20px; color: #1a1a2e; margin: 0 0 14px;">New contact form message</h2>
              <p style="font-size: 14px; color: #444; margin: 0 0 6px;"><strong>From:</strong> ${name} &lt;${email}&gt;</p>
              <p style="font-size: 14px; color: #444; margin: 0 0 18px;"><strong>Date:</strong> ${newMessage.createdAt}</p>
              <div style="font-size: 14px; line-height: 1.65; color: #222; white-space: pre-wrap; border: 1px solid #e5e6ea; border-radius: 10px; padding: 14px 16px; background: #fafafb;">
${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
              </div>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("[Contact] Email send failed:", emailErr);
      }
    } else {
      console.warn("[Contact] SMTP not configured; contact message email not sent.");
    }

    // Log to server console so it's visible in PM2 logs, including mail outcome.
    console.log(`[Contact] New message from ${name} <${email}>: ${message.slice(0, 100)}...`);
    console.log(`[Contact] Routed to ${CONTACT_TO_EMAIL}. emailSent=${emailSent}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Contact] Error:", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
