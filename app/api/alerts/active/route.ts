import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/alerts/active — return the latest active alert whose scheduled time has passed (public) */
export async function GET() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Auto-deactivate alerts older than 1 hour past their scheduled time
  await prisma.adminAlert.updateMany({
    where: { active: true, scheduledFor: { lt: oneHourAgo } },
    data: { active: false },
  });

  const alert = await prisma.adminAlert.findFirst({
    where: {
      active: true,
      scheduledFor: { lte: now },
    },
    orderBy: { scheduledFor: "desc" },
    select: { id: true, message: true, scheduledFor: true, createdAt: true },
  });
  return NextResponse.json(alert ?? null);
}
