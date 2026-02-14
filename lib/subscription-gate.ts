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

const ADMIN_EMAIL = "kickablur@icloud.com";

export type GateResult = {
  authorized: boolean;
  isAdmin: boolean;
  email: string | null;
  userId: string | null;
  subscriptionStatus: string | null;
  sessionStale?: boolean;
};

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

  // Look up user and subscription
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
