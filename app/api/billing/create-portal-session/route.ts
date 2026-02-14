import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePrismaUserForSessionEmail } from "@/lib/session-user";

export const runtime = "nodejs";

export async function POST() {
  /* ── auth ─────────────────────────────────────────── */
  const sessionUser = await ensurePrismaUserForSessionEmail();
  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  /* ── stripe env guard ─────────────────────────────── */
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      {
        error: "Stripe is not configured yet. Ask the admin to add STRIPE_SECRET_KEY to .env.",
        configured: false,
      },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      stripeCustomer: { select: { stripeCustomerId: true } },
    },
  });

  const stripeCustomerId = user?.stripeCustomer?.stripeCustomerId;
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No active Stripe subscription found. Subscribe first." },
      { status: 400 },
    );
  }

  const { getStripeClient } = await import("@/lib/stripe");
  const stripe = getStripeClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const portal = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/studio`,
  });

  return NextResponse.json({ url: portal.url });
}
