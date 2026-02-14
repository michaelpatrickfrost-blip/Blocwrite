import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";

export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), "data");
const NOVELS_FILE = join(DATA_DIR, "novels.json");

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
    const raw = await readFile(NOVELS_FILE, "utf-8").catch(() => "[]");
    const novels = JSON.parse(raw);
    return NextResponse.json(novels);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

async function saveNovelsHandler(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // sendBeacon sends text/plain, normal fetch sends application/json — handle both
    const text = await request.text();
    const body = JSON.parse(text);
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected an array of novels." }, { status: 400 });
    }

    await ensureDataDir();
    await writeFile(NOVELS_FILE, JSON.stringify(body), "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save novels." }, { status: 500 });
  }
}

// Support both PUT (normal saves) and POST (sendBeacon on page close)
export const PUT = saveNovelsHandler;
export const POST = saveNovelsHandler;
