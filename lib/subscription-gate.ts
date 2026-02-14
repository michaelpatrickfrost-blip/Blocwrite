/**
 * Server-side subscription gate.
 * Checks if the current bw-session user has an active subscription.
 * Admin email always bypasses.
 */

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifySessionToken } from "@/lib/bw-auth";

const ADMIN_EMAIL = "kickablur@icloud.com";

export type GateResult = {
  authorized: boolean;
  isAdmin: boolean;
  email: string | null;
  userId: string | null;
  subscriptionStatus: string | null;
};

/** Check if the current user has an active subscription or is the admin. */
export async function checkSubscriptionGate(): Promise<GateResult> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    return { authorized: false, isAdmin: false, email: null, userId: null, subscriptionStatus: null };
  }

  const email = verifySessionToken(token);
  if (!email) {
    return { authorized: false, isAdmin: false, email: null, userId: null, subscriptionStatus: null };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Admin always gets in
  if (normalizedEmail === ADMIN_EMAIL) {
    return { authorized: true, isAdmin: true, email: normalizedEmail, userId: null, subscriptionStatus: "admin" };
  }

  // Look up user and subscription
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      subscriptions: {
        where: {
          status: { in: ["active", "trialing"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });

  if (!user) {
    return { authorized: false, isAdmin: false, email: normalizedEmail, userId: null, subscriptionStatus: null };
  }

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
      subscriptions: {
        where: { status: { in: ["active", "trialing"] } },
        take: 1,
        select: { id: true },
      },
    },
  });

  return Boolean(user?.subscriptions?.length);
}
