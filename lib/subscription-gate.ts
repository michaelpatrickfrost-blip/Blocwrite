/**
 * Server-side subscription gate.
 * Checks if the current bw-session user has an active subscription.
 * Also enforces single-session: if the token nonce doesn't match the DB nonce,
 * the session is stale (user logged in elsewhere) and is rejected.
 * Admin email always bypasses.
 */

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, extractSessionPayload } from "@/lib/bw-auth";
import Stripe from "stripe";
import { getResolvedStripeConfig } from "@/lib/admin-config";

const ADMIN_EMAIL = "kickablur@icloud.com";

export type GateResult = {
  authorized: boolean;
  isAdmin: boolean;
  email: string | null;
  userId: string | null;
  subscriptionStatus: string | null;
  sessionStale?: boolean;
};

function toDate(value: number | null | undefined) {
  if (!value) return null;
  return new Date(value * 1000);
}

async function syncStripeSubscriptionAccess(
  userId: string,
  email: string,
  existingStripeCustomerId?: string | null,
): Promise<{ authorized: boolean; status: string | null }> {
  try {
    const config = await getResolvedStripeConfig();
    if (!config.secretKey) return { authorized: false, status: null };
    const stripe = new Stripe(config.secretKey);

    let stripeCustomerId = (existingStripeCustomerId || "").trim();
    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (!customers.data.length) return { authorized: false, status: null };
      stripeCustomerId = customers.data[0].id;
    }

    await prisma.stripeCustomer.upsert({
      where: { userId },
      update: { stripeCustomerId },
      create: { userId, stripeCustomerId },
    });

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 100,
    });

    for (const sub of subscriptions.data) {
      const firstItem = sub.items.data[0];
      const stripePriceId = firstItem?.price?.id || "";
      if (!stripePriceId) continue;
      await prisma.subscription.upsert({
        where: { stripeSubscriptionId: sub.id },
        update: {
          userId,
          stripeCustomerId,
          stripePriceId,
          status: sub.status,
          currentPeriodEnd: toDate((sub as { current_period_end?: number | null }).current_period_end),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialEnd: toDate(sub.trial_end),
        },
        create: {
          userId,
          stripeCustomerId,
          stripeSubscriptionId: sub.id,
          stripePriceId,
          status: sub.status,
          currentPeriodEnd: toDate((sub as { current_period_end?: number | null }).current_period_end),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialEnd: toDate(sub.trial_end),
        },
      });
    }

    const hasActive = subscriptions.data.some((sub) => sub.status === "active");
    const hasTrial = subscriptions.data.some((sub) => sub.status === "trialing");
    if (hasActive) return { authorized: true, status: "active" };
    if (hasTrial) return { authorized: true, status: "trialing" };
    return { authorized: false, status: null };
  } catch {
    return { authorized: false, status: null };
  }
}

/** Check if the current user has an active subscription or is the admin. */
export async function checkSubscriptionGate(): Promise<GateResult> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    return { authorized: false, isAdmin: false, email: null, userId: null, subscriptionStatus: null };
  }

  const payload = extractSessionPayload(token);
  if (!payload) {
    return { authorized: false, isAdmin: false, email: null, userId: null, subscriptionStatus: null };
  }

  const normalizedEmail = payload.email.trim().toLowerCase();

  // Local dev bypass — skip subscription check so you can access studio
  if (process.env.BYPASS_STUDIO_GATE === "1") {
    return { authorized: true, isAdmin: false, email: normalizedEmail, userId: null, subscriptionStatus: "bypass" };
  }

  // Admin always gets in (but still validate nonce)
  if (normalizedEmail === ADMIN_EMAIL) {
    // Check nonce for admin too
    if (payload.nonce) {
      const adminUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { sessionNonce: true },
      });
      if (adminUser && adminUser.sessionNonce && adminUser.sessionNonce !== payload.nonce) {
        return { authorized: false, isAdmin: true, email: normalizedEmail, userId: null, subscriptionStatus: "admin", sessionStale: true };
      }
    }
    return { authorized: true, isAdmin: true, email: normalizedEmail, userId: null, subscriptionStatus: "admin" };
  }

  // Look up user, subscription, and guest access
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      sessionNonce: true,
      subscriptions: {
        where: {
          status: { in: ["active", "trialing"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { status: true },
      },
      guestAccess: {
        select: { expiresAt: true, duration: true },
      },
      stripeCustomer: {
        select: { stripeCustomerId: true },
      },
    },
  });

  if (!user) {
    return { authorized: false, isAdmin: false, email: normalizedEmail, userId: null, subscriptionStatus: null };
  }

  // ── Single-session enforcement: check nonce ──
  // If the token has a nonce and it doesn't match the DB, the user logged in elsewhere
  if (payload.nonce && user.sessionNonce && payload.nonce !== user.sessionNonce) {
    return {
      authorized: false,
      isAdmin: false,
      email: normalizedEmail,
      userId: user.id,
      subscriptionStatus: null,
      sessionStale: true,
    };
  }

  // Check active subscription first
  const activeSub = user.subscriptions[0];
  if (activeSub) {
    return {
      authorized: true,
      isAdmin: false,
      email: normalizedEmail,
      userId: user.id,
      subscriptionStatus: activeSub.status,
    };
  }

  // Check guest access (admin-granted free access)
  if (user.guestAccess) {
    const ga = user.guestAccess;
    const isValid = ga.duration === "forever" || !ga.expiresAt || new Date(ga.expiresAt) > new Date();
    if (isValid) {
      return {
        authorized: true,
        isAdmin: false,
        email: normalizedEmail,
        userId: user.id,
        subscriptionStatus: "guest",
      };
    }
  }

  // Last-chance Stripe reconciliation to prevent false paywall redirects
  // when webhook sync lags behind a successful checkout.
  const stripeGate = await syncStripeSubscriptionAccess(
    user.id,
    normalizedEmail,
    user.stripeCustomer?.stripeCustomerId,
  );
  if (stripeGate.authorized) {
    return {
      authorized: true,
      isAdmin: false,
      email: normalizedEmail,
      userId: user.id,
      subscriptionStatus: stripeGate.status,
    };
  }

  return {
    authorized: false,
    isAdmin: false,
    email: normalizedEmail,
    userId: user.id,
    subscriptionStatus: null,
  };
}

/** Quick helper to check subscription status for a given email (used by login API). */
export async function hasActiveSubscription(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL) return true;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      subscriptions: {
        where: { status: { in: ["active", "trialing"] } },
        take: 1,
        select: { id: true },
      },
      guestAccess: {
        select: { expiresAt: true, duration: true },
      },
      stripeCustomer: {
        select: { stripeCustomerId: true },
      },
    },
  });

  if (user?.subscriptions?.length) return true;

  // Check guest access
  if (user?.guestAccess) {
    const ga = user.guestAccess;
    if (ga.duration === "forever" || !ga.expiresAt || new Date(ga.expiresAt) > new Date()) {
      return true;
    }
  }

  if (user?.id) {
    const stripeGate = await syncStripeSubscriptionAccess(
      user.id,
      normalizedEmail,
      user.stripeCustomer?.stripeCustomerId,
    );
    if (stripeGate.authorized) return true;
  }

  return false;
}
