import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePrismaUserForSessionEmail } from "@/lib/session-user";
import { getResolvedStripeConfig } from "@/lib/admin-config";

export const runtime = "nodejs";

export async function POST() {
  /* ── auth ─────────────────────────────────────────── */
  const user = await ensurePrismaUserForSessionEmail();
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  /* ── resolved stripe config (admin UI > env var) ── */
  const config = await getResolvedStripeConfig();
  if (!config.secretKey || !config.priceId) {
    return NextResponse.json(
      { error: "Stripe is not configured. The admin needs to connect Stripe in the Admin Hub.", configured: false },
      { status: 503 },
    );
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(config.secretKey, { apiVersion: "2025-12-18.acacia" as import("stripe").Stripe.LatestApiVersion, typescript: true });

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

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: config.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${config.appUrl}/studio?billing=success`,
    cancel_url: `${config.appUrl}/studio?billing=cancelled`,
    metadata: { userId: user.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
