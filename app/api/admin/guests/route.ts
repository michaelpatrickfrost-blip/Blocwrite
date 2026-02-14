import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import bcrypt from "bcrypt";

export const runtime = "nodejs";

/**
 * GET /api/admin/guests
 * List all guest-access users with status.
 */
export async function GET() {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guests = await prisma.guestAccess.findMany({
    include: {
      user: { select: { email: true, name: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const result = guests.map((g) => ({
    id: g.id,
    email: g.user.email,
    name: g.user.name,
    duration: g.duration,
    expiresAt: g.expiresAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    status:
      g.duration === "forever"
        ? "active"
        : g.expiresAt && g.expiresAt < now
          ? "expired"
          : "active",
  }));

  return NextResponse.json(result);
}

/**
 * POST /api/admin/guests
 * Grant a user free access. Creates the user account if needed.
 * Body: { email: string, duration: "7days" | "1month" | "forever", password?: string }
 */
export async function POST(request: Request) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      email?: string;
      duration?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const duration = body.duration;
    if (!duration || !["7days", "1month", "forever"].includes(duration)) {
      return NextResponse.json({ error: "Duration must be 7days, 1month, or forever." }, { status: 400 });
    }

    // Calculate expiry
    let expiresAt: Date | null = null;
    if (duration === "7days") {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (duration === "1month") {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Find or create the user
    let user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (!user) {
      // Create the user with a default password they can reset
      const defaultPassword = body.password?.trim() || "blocwrite123";
      const passwordHash = await bcrypt.hash(defaultPassword, 12);
      user = await prisma.user.create({
        data: { email, passwordHash },
        select: { id: true },
      });
    }

    // Upsert guest access
    await prisma.guestAccess.upsert({
      where: { userId: user.id },
      update: { duration, expiresAt, grantedBy: admin },
      create: { userId: user.id, duration, expiresAt, grantedBy: admin },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Guest access grant failed:", err);
    return NextResponse.json({ error: "Failed to grant access." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/guests
 * Revoke guest access. Body: { id: string }
 */
export async function DELETE(request: Request) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Guest access ID is required." }, { status: 400 });
    }

    await prisma.guestAccess.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to revoke access." }, { status: 500 });
  }
}
