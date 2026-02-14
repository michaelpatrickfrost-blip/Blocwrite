import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { readAdminConfig, writeAdminConfig, getResolvedStripeConfig } from "@/lib/admin-config";

export const runtime = "nodejs";

/** GET — return current config status (keys masked for security). */
export async function GET() {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await readAdminConfig();
  const resolved = await getResolvedStripeConfig();

  return NextResponse.json({
    stripeSecretKey: resolved.secretKey ? mask(resolved.secretKey) : "",
    stripeWebhookSecret: resolved.webhookSecret ? mask(resolved.webhookSecret) : "",
    stripePriceId: resolved.priceId || "",
    appUrl: resolved.appUrl,
    ready: resolved.ready,
    source: {
      stripeSecretKey: config.stripeSecretKey ? "admin" : process.env.STRIPE_SECRET_KEY ? "env" : "missing",
      stripeWebhookSecret: config.stripeWebhookSecret ? "admin" : process.env.STRIPE_WEBHOOK_SECRET ? "env" : "missing",
      stripePriceId: config.stripePriceId ? "admin" : process.env.STRIPE_PRICE_ID ? "env" : "missing",
    },
  });
}

/** PUT — save Stripe config keys. Only non-empty values are updated. */
export async function PUT(request: Request) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as Record<string, string>;
    const patch: Record<string, string> = {};

    if (body.stripeSecretKey?.trim()) patch.stripeSecretKey = body.stripeSecretKey.trim();
    if (body.stripeWebhookSecret?.trim()) patch.stripeWebhookSecret = body.stripeWebhookSecret.trim();
    if (body.stripePriceId?.trim()) patch.stripePriceId = body.stripePriceId.trim();
    if (body.appUrl?.trim()) patch.appUrl = body.appUrl.trim();

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No values provided" }, { status: 400 });
    }

    await writeAdminConfig(patch);
    const resolved = await getResolvedStripeConfig();

    return NextResponse.json({
      ok: true,
      ready: resolved.ready,
      stripeSecretKey: resolved.secretKey ? mask(resolved.secretKey) : "",
      stripeWebhookSecret: resolved.webhookSecret ? mask(resolved.webhookSecret) : "",
      stripePriceId: resolved.priceId || "",
      appUrl: resolved.appUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save config" },
      { status: 500 },
    );
  }
}

/** Show first 8 and last 4 chars, mask the middle. */
function mask(value: string): string {
  if (value.length <= 12) return "****";
  return value.slice(0, 8) + "****" + value.slice(-4);
}
