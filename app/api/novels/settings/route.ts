import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";

export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), "data");
const SETTINGS_FILE = join(DATA_DIR, "settings.json");

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const email = verifySessionToken(token);
  return email !== null;
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDataDir();
    const raw = await readFile(SETTINGS_FILE, "utf-8").catch(() => "{}");
    const settings = JSON.parse(raw);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Expected a settings object." }, { status: 400 });
    }

    await ensureDataDir();
    await writeFile(SETTINGS_FILE, JSON.stringify(body), "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
