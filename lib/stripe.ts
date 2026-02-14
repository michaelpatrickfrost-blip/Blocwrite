import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return key;
}

export const stripe =
  globalForStripe.stripe ??
  new Stripe(getStripeSecretKey(), {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripe = stripe;
}

export function getStripePriceId() {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID is not set");
  }
  return priceId;
}
