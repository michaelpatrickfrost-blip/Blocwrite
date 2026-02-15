import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/alerts — get the current active alert (public, polled by studio) */
export async function GET() {
  const alert = await prisma.adminAlert.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, message: true, durationSec: true, createdAt: true },
  });
  return NextResponse.json(alert || null);
}
