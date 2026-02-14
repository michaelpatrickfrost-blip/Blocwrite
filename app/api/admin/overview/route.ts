import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const adminEmail = await requireAdminApiAccess();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, grouped, recent, failedInvoices] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.subscription.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        stripePriceId: true,
        updatedAt: true,
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.stripeWebhookEvent.count({
      where: { eventType: "invoice.payment_failed" },
    }),
  ]);

  return NextResponse.json({
    users,
    statusCounts: grouped.map((row) => ({ status: row.status, count: row._count.status })),
    failedInvoices,
    recentChanges: recent,
  });
}
