import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePrismaUserForSessionEmail } from "@/lib/session-user";
import { getResolvedStripeConfig } from "@/lib/admin-config";

export const runtime = "nodejs";

/**
 * POST /api/billing/cancel-subscription
 * Cancels the user's active subscription at the end of the current billing period.
 * Does NOT refund — just stops future renewals.
 */
export async function POST() {
  const sessionUser = await ensurePrismaUserForSessionEmail();
  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the active subscription
  const sub = await prisma.subscription.findFirst({
    where: {
      userId: sessionUser.id,
      status: { in: ["active", "trialing"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      stripeSubscriptionId: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (!sub) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 400 });
  }

  if (sub.cancelAtPeriodEnd) {
    return NextResponse.json({ error: "Subscription is already set to cancel." }, { status: 400 });
  }

  // Get Stripe config
  const config = await getResolvedStripeConfig();
  if (!config.secretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(config.secretKey);

    // Cancel at end of period (not immediately)
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local DB
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({ ok: true, message: "Subscription will cancel at the end of the current billing period." });
  } catch (err) {
    console.error("[Cancel Subscription] Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to cancel subscription.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
