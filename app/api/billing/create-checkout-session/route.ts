import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePrismaUserForSessionEmail } from "@/lib/session-user";
import { getResolvedStripeConfig } from "@/lib/admin-config";

export const runtime = "nodejs";

/**
 * Resolve the price ID for the selected plan.
 * Checks env vars first, then admin config fallback.
 */
async function resolvePriceId(plan: string): Promise<string | null> {
  const config = await getResolvedStripeConfig();

  if (plan === "annual") {
    const annualEnv = process.env.STRIPE_PRICE_ID_ANNUAL;
    if (annualEnv && annualEnv.length > 4) return annualEnv;
    return config.priceId || null;
  }

  // Monthly
  const monthlyEnv = process.env.STRIPE_PRICE_ID_MONTHLY;
  if (monthlyEnv && monthlyEnv.length > 4) return monthlyEnv;
  return config.priceId || null;
}

export async function POST(request: Request) {
  try {
    /* ── auth ─────────────────────────────────────────── */
    const user = await ensurePrismaUserForSessionEmail();
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    /* ── parse plan selection ─────────────────────────── */
    const body = (await request.json().catch(() => ({}))) as {
      plan?: string;
      priceId?: string;
    };
    const plan = body.plan || "monthly";
    const selectedPriceId = body.priceId || (await resolvePriceId(plan));

    if (!selectedPriceId) {
      return NextResponse.json(
        { error: "No subscription price configured. Contact support." },
        { status: 503 },
      );
    }

    /* ── resolved stripe config ────────────────────── */
    const config = await getResolvedStripeConfig();
    if (!config.secretKey) {
      return NextResponse.json(
        { error: "Payment system is not configured yet." },
        { status: 503 },
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(config.secretKey, {
      apiVersion: "2025-12-18.acacia" as import("stripe").Stripe.LatestApiVersion,
      typescript: true,
    });

    /* ── ensure Stripe customer ────────────────────── */
    let stripeCustomerId = user.stripeCustomer?.stripeCustomerId || "";
    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        stripeCustomerId = customer.id;
        await prisma.stripeCustomer.upsert({
          where: { userId: user.id },
          update: { stripeCustomerId },
          create: { userId: user.id, stripeCustomerId },
        });
      } catch (custErr) {
        console.error("[checkout] Failed to create Stripe customer:", custErr);
        const msg = custErr instanceof Error ? custErr.message : String(custErr);
        return NextResponse.json(
          { error: `Stripe customer creation failed: ${msg}` },
          { status: 500 },
        );
      }
    }

    /* ── create checkout session with 7-day trial ──── */
    const appUrl = config.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: selectedPriceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${appUrl}/studio?billing=success`,
      cancel_url: `${appUrl}/subscribe?billing=cancelled`,
      metadata: { userId: user.id, plan },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[checkout] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Checkout failed: ${message}` },
      { status: 500 },
    );
  }
}
