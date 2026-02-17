import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const runtime = "nodejs";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `BW-${result}`;
}

function generatePassword(): string {
  const words = ["write", "novel", "draft", "story", "prose", "chapter", "plot", "scene"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  const symbols = ["!", "#", "@", "&"];
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  return `${word}${num}${sym}`;
}

/**
 * GET /api/admin/trials
 * List all trial codes with status.
 */
export async function GET() {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const codes = await prisma.trialCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const result = codes.map((c) => ({
      id: c.id,
      code: c.code,
      note: c.note,
      expiresAt: c.expiresAt.toISOString(),
      redeemedBy: c.redeemedBy,
      redeemedAt: c.redeemedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      status: c.redeemedBy
        ? "redeemed"
        : c.expiresAt < now
          ? "expired"
          : "active",
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch trials error:", error);
    return NextResponse.json({ error: "Failed to fetch trial codes." }, { status: 500 });
  }
}

/**
 * POST /api/admin/trials
 * Generate a new trial code.
 * Body: { note?: string }
 * Returns: { code, password } in plaintext (one-time display).
 */
export async function POST(request: Request) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as { note?: string };

    let code = generateCode();
    // Ensure uniqueness
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.trialCode.findUnique({ where: { code } });
      if (!exists) break;
      code = generateCode();
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    // Code is valid to redeem for 30 days; once redeemed the user gets 30 days of access
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.trialCode.create({
      data: {
        code,
        passwordHash,
        note: body.note?.trim() || null,
        expiresAt,
      },
    });

    return NextResponse.json({ ok: true, code, password });
  } catch (error) {
    console.error("Generate trial code error:", error);
    return NextResponse.json({ error: "Failed to generate trial code." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/trials
 * Delete a trial code. Body: { id: string }
 */
export async function DELETE(request: Request) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Trial code ID is required." }, { status: 400 });
    }

    await prisma.trialCode.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete trial code." }, { status: 500 });
  }
}
