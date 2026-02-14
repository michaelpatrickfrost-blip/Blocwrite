import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getResolvedStripeConfig } from "@/lib/admin-config";

export const runtime = "nodejs";

function toDate(value: number | null | undefined) {
  if (!value) return null;
  return new Date(value * 1000);
}

async function getStripe(secretKey: string) {
  return new Stripe(secretKey, { apiVersion: "2025-12-18.acacia" as Stripe.LatestApiVersion, typescript: true });
}

async function resolveUserByCustomerId(stripeCustomerId: string, stripe: Stripe): Promise<string | null> {
  const existing = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId },
    select: { userId: true },
  });
  if (existing?.userId) return existing.userId;

  const customer = await stripe.customers.retrieve(stripeCustomerId);
  if (customer.deleted) return null;
  const email = customer.email?.trim().toLowerCase();
  if (!email) return null;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return null;

  await prisma.stripeCustomer.upsert({
    where: { userId: user.id },
    update: { stripeCustomerId },
    create: { userId: user.id, stripeCustomerId },
  });
  return user.id;
}

async function upsertFromSubscription(subscription: Stripe.Subscription, stripe: Stripe) {
  const stripeCustomerId = String(subscription.customer);
  const userId = await resolveUserByCustomerId(stripeCustomerId, stripe);
  if (!userId) return;

  const firstItem = subscription.items.data[0];
  const stripePriceId = firstItem?.price?.id || "";
  if (!stripePriceId) return;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: {
      userId,
      stripeCustomerId,
      stripePriceId,
      status: subscription.status,
      currentPeriodEnd: toDate((subscription as { current_period_end?: number | null }).current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: toDate(subscription.trial_end),
    },
    create: {
      userId,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId,
      status: subscription.status,
      currentPeriodEnd: toDate((subscription as { current_period_end?: number | null }).current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: toDate(subscription.trial_end),
    },
  });
}

async function markSubscriptionStatusByInvoice(invoice: Stripe.Invoice, status: string) {
  const inv = invoice as unknown as { subscription?: string | Stripe.Subscription };
  const subscriptionId = typeof inv.subscription === "string" ? inv.subscription : null;
  if (!subscriptionId) return;
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status },
  });
}

export async function POST(request: Request) {
  /* ── resolve config ──────────────────────────────── */
  const config = await getResolvedStripeConfig();
  if (!config.secretKey || !config.webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured. Connect Stripe in the Admin Hub." },
      { status: 503 },
    );
  }

  const stripe = await getStripe(config.secretKey);

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, config.webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 400 },
    );
  }

  const alreadyProcessed = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
    select: { id: true },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await upsertFromSubscription(subscription, stripe);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(subscription, stripe);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await markSubscriptionStatusByInvoice(invoice, "active");
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await markSubscriptionStatusByInvoice(invoice, "past_due");
        break;
      }
      default:
        break;
    }

    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        status: "processed",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        status: "error",
        error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown webhook error",
      },
    });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
