import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePrismaUserForSessionEmail } from "@/lib/session-user";

export const runtime = "nodejs";

export async function POST() {
  /* ── auth ─────────────────────────────────────────── */
  const user = await ensurePrismaUserForSessionEmail();
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  /* ── stripe env guard ─────────────────────────────── */
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripeKey || !priceId) {
    return NextResponse.json(
      {
        error: "Stripe is not configured yet. Ask the admin to add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to .env.",
        configured: false,
      },
      { status: 503 },
    );
  }

  /* ── lazy-load stripe ─────────────────────────────── */
  const { getStripeClient } = await import("@/lib/stripe");
  const stripe = getStripeClient();

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/studio?billing=success`,
    cancel_url: `${appUrl}/studio?billing=cancelled`,
    metadata: { userId: user.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
