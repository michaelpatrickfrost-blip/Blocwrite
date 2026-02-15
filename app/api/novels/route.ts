import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { verifySessionToken, COOKIE_NAME } from "@/lib/bw-auth";

export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), "data");
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "kickablur@icloud.com").trim().toLowerCase();

/** Get the authenticated user's email, or null. */
async function getAuthEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const email = verifySessionToken(token);
  return email ? email.trim().toLowerCase() : null;
}

/**
 * Get the user-specific data directory.
 * Admin uses the root data/ dir (preserves existing data).
 * Other users get data/{emailHash}/ for isolation.
 */
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
    const raw = await readFile(join(dir, "novels.json"), "utf-8").catch(() => "[]");
    const novels = JSON.parse(raw);
    return NextResponse.json(novels);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

async function saveNovelsHandler(request: Request) {
  const email = await getAuthEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const text = await request.text();
    const body = JSON.parse(text);
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected an array of novels." }, { status: 400 });
    }

    const dir = getUserDataDir(email);
    await ensureDir(dir);
    await writeFile(join(dir, "novels.json"), JSON.stringify(body), "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save novels." }, { status: 500 });
  }
}

export const PUT = saveNovelsHandler;
export const POST = saveNovelsHandler;
