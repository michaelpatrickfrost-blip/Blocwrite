import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const adminEmail = await requireAdminApiAccess();
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const search = request.nextUrl.searchParams.get("q")?.trim() || "";
    const where = search
      ? {
          OR: [
            { email: { contains: search } },
            { name: { contains: search } },
          ],
        }
      : undefined;

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        stripeCustomer: {
          select: { stripeCustomerId: true },
        },
        subscriptions: {
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: {
            id: true,
            status: true,
            stripePriceId: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            updatedAt: true,
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to query users", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
