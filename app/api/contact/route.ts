import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), "data");
const MESSAGES_FILE = join(DATA_DIR, "contact-messages.json");

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

    // Log to server console so it's visible in PM2 logs
    console.log(`[Contact] New message from ${name} <${email}>: ${message.slice(0, 100)}...`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Contact] Error:", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
