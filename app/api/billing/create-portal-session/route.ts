import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePrismaUserForSessionEmail } from "@/lib/session-user";
import { getResolvedStripeConfig } from "@/lib/admin-config";

export const runtime = "nodejs";

export async function POST() {
  /* ── auth ─────────────────────────────────────────── */
  const sessionUser = await ensurePrismaUserForSessionEmail();
  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  /* ── resolved stripe config ────────────────────── */
  const config = await getResolvedStripeConfig();
  if (!config.secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Connect Stripe in the Admin Hub first.", configured: false },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { stripeCustomer: { select: { stripeCustomerId: true } } },
  });

  const stripeCustomerId = user?.stripeCustomer?.stripeCustomerId;
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No active Stripe subscription found. Subscribe first." },
      { status: 400 },
    );
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(config.secretKey, { apiVersion: "2025-12-18.acacia" as import("stripe").Stripe.LatestApiVersion, typescript: true });

  const portal = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${config.appUrl}/studio`,
  });

  return NextResponse.json({ url: portal.url });
}
