import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePrismaUserForSessionEmail } from "@/lib/session-user";

export const runtime = "nodejs";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "kickablur@icloud.com").trim().toLowerCase();

/**
 * GET /api/billing/subscription
 * Returns the current user's active subscription details for display in Settings.
 */
export async function GET() {
  const sessionUser = await ensurePrismaUserForSessionEmail();
  if (!sessionUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = sessionUser.email.trim().toLowerCase();

  // Admin bypass — they never have a real subscription
  if (email === ADMIN_EMAIL) {
    return NextResponse.json({
      email,
      plan: "admin",
      status: "active",
      isAdmin: true,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      daysRemaining: null,
    });
  }

  // Find the most recent active/trialing subscription
  const sub = await prisma.subscription.findFirst({
    where: {
      userId: sessionUser.id,
      status: { in: ["active", "trialing"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      stripePriceId: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      trialEnd: true,
    },
  });

  if (!sub) {
    return NextResponse.json({
      email,
      plan: null,
      status: null,
      isAdmin: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      daysRemaining: null,
    });
  }

  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (sub.currentPeriodEnd) {
    const msLeft = new Date(sub.currentPeriodEnd).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  }

  // Determine plan name from price ID
  const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY ?? "";
  const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL ?? "";
  let plan = "subscription";
  if (sub.stripePriceId === monthlyPriceId) plan = "Monthly";
  else if (sub.stripePriceId === annualPriceId) plan = "Annual";

  return NextResponse.json({
    email,
    plan,
    status: sub.status,
    isAdmin: false,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    trialEnd: sub.trialEnd?.toISOString() ?? null,
    daysRemaining,
  });
}
