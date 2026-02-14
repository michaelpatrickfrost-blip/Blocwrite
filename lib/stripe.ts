import Stripe from "stripe";

/**
 * Stripe client factory.
 * Reads the secret key from:
 *  1. data/admin-config.json (set via Admin Hub UI)
 *  2. STRIPE_SECRET_KEY env var (fallback)
 *
 * Always call getStripeClient() at runtime — never at import time.
 */

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return key;
}

/** Standard Stripe client using env var. For admin-config-aware usage, use getConfiguredStripeClient(). */
export function getStripeClient(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe;
  // Don't hardcode apiVersion — let Stripe use the account's dashboard version.
  // This avoids "Invalid Stripe API version" errors when the account is on a newer version.
  const client = new Stripe(getStripeSecretKey());
  if (process.env.NODE_ENV !== "production") {
    globalForStripe.stripe = client;
  }
  return client;
}

/** Create a Stripe client using the resolved admin config (file > env). Returns null if no key available. */
export async function getConfiguredStripeClient(): Promise<Stripe | null> {
  // Dynamic import to avoid circular dependencies
  const { getResolvedStripeConfig } = await import("@/lib/admin-config");
  const config = await getResolvedStripeConfig();
  if (!config.secretKey) return null;
  return new Stripe(config.secretKey);
}

export function getStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID is not set");
  }
  return priceId;
}
