import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

/** GET /api/admin/alerts — list all alerts (admin) */
export async function GET() {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await prisma.adminAlert.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  return NextResponse.json(alerts);
}

/** POST /api/admin/alerts — create a new alert */
export async function POST(req: NextRequest) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, durationSec } = await req.json() as { message?: string; durationSec?: number };
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  // Deactivate any currently active alerts
  await prisma.adminAlert.updateMany({ where: { active: true }, data: { active: false } });

  const alert = await prisma.adminAlert.create({
    data: {
      message: message.trim(),
      durationSec: durationSec && durationSec > 0 ? durationSec : 15,
      active: true,
    },
  });
  return NextResponse.json({ ok: true, alert });
}

/** DELETE /api/admin/alerts — deactivate an alert */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id?: string };
  if (id) {
    await prisma.adminAlert.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.adminAlert.updateMany({ where: { active: true }, data: { active: false } });
  }
  return NextResponse.json({ ok: true });
}
