import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

export async function GET() {
  const adminEmail = await requireAdminApiAccess();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Novel count from file
  let novelCount = 0;
  try {
    const raw = await readFile(join(process.cwd(), "data", "novels.json"), "utf-8");
    const arr = JSON.parse(raw);
    novelCount = Array.isArray(arr) ? arr.length : 0;
  } catch {
    // No novels file yet
  }

  // DB queries with fallback
  let users = 0;
  let statusCounts: { status: string; count: number }[] = [];
  let failedInvoices = 0;

  try {
    const [uc, grouped, fi] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.stripeWebhookEvent.count({
        where: { eventType: "invoice.payment_failed" },
      }),
    ]);
    users = uc;
    statusCounts = grouped.map((row) => ({ status: row.status, count: row._count.status }));
    failedInvoices = fi;
  } catch {
    // DB not ready
  }

  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRICE_ID,
  );

  return NextResponse.json({
    novelCount,
    users,
    statusCounts,
    failedInvoices,
    stripeConfigured,
  });
}
