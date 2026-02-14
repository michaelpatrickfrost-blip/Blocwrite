import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";

export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), "data");
const ADMIN_EMAIL = "kickablur@icloud.com";

async function getAuthEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const email = verifySessionToken(token);
  return email ? email.trim().toLowerCase() : null;
}

function getUserDataDir(email: string): string {
  if (email === ADMIN_EMAIL) {
    return DATA_DIR;
  }
  const hash = createHash("sha256").update(email).digest("hex").slice(0, 16);
  return join(DATA_DIR, "users", hash);
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function GET() {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dir = getUserDataDir(email);
    await ensureDir(dir);
    const raw = await readFile(join(dir, "settings.json"), "utf-8").catch(() => "{}");
    const settings = JSON.parse(raw);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}

export async function PUT(request: Request) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Expected a settings object." }, { status: 400 });
    }

    const dir = getUserDataDir(email);
    await ensureDir(dir);
    await writeFile(join(dir, "settings.json"), JSON.stringify(body), "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
