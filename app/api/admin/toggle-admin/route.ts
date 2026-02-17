import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess, isAdminEmail } from "@/lib/admin-auth";

export const runtime = "nodejs";

/**
 * POST /api/admin/toggle-admin
 * Toggle isAdmin flag for a user. Only the primary admin (env ADMIN_EMAIL) can do this.
 * Body: { email: string, isAdmin: boolean }
 */
export async function POST(request: Request) {
  const adminEmail = await requireAdminApiAccess();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only the primary admin (from env) can grant/revoke admin rights
  if (!isAdminEmail(adminEmail)) {
    return NextResponse.json(
      { error: "Only the primary admin can manage admin rights." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as { email?: string; isAdmin?: boolean };
    const targetEmail = body.email?.trim().toLowerCase();
    if (!targetEmail) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Cannot change own admin status
    if (isAdminEmail(targetEmail)) {
      return NextResponse.json(
        { error: "Cannot change the primary admin's status." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: body.isAdmin === true },
    });

    return NextResponse.json({ ok: true, isAdmin: body.isAdmin === true });
  } catch (err) {
    console.error("Toggle admin error:", err);
    return NextResponse.json({ error: "Failed to update admin status." }, { status: 500 });
  }
}
