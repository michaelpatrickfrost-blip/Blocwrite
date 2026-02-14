import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePrismaUserForSessionEmail } from "@/lib/session-user";
import { getResolvedStripeConfig } from "@/lib/admin-config";

export const runtime = "nodejs";

/**
 * Resolve the price ID for the selected plan.
 * Checks admin config first, then env vars, then falls back to a default.
 */
async function resolvePriceId(plan: string): Promise<string | null> {
  const config = await getResolvedStripeConfig();

  if (plan === "annual") {
    // Annual price: check env var
    const annualEnv = process.env.STRIPE_PRICE_ID_ANNUAL;
    if (annualEnv && annualEnv.length > 4) return annualEnv;
    // Fall back to default price
    return config.priceId || null;
  }

  // Monthly price: check env var, then admin config
  const monthlyEnv = process.env.STRIPE_PRICE_ID_MONTHLY;
  if (monthlyEnv && monthlyEnv.length > 4) return monthlyEnv;
  return config.priceId || null;
}

export async function POST(request: Request) {
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
  }

  /* ── create checkout session with 7-day trial ──── */
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: selectedPriceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 7,
    },
    success_url: `${config.appUrl}/studio?billing=success`,
    cancel_url: `${config.appUrl}/subscribe?billing=cancelled`,
    metadata: { userId: user.id, plan },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
