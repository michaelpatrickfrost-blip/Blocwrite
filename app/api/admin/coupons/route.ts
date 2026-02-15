import Stripe from "stripe";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { getResolvedStripeConfig } from "@/lib/admin-config";

export const runtime = "nodejs";

/** Get a Stripe client using resolved config (admin file > env var). */
async function getConfiguredStripe(): Promise<Stripe | null> {
  const config = await getResolvedStripeConfig();
  if (!config.secretKey) return null;
  return new Stripe(config.secretKey);
}

/** GET — list existing promotion codes with their coupons. */
export async function GET() {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = await getConfiguredStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not connected yet. Add your keys in the setup section above.", codes: [] },
      { status: 503 },
    );
  }

  try {
    const promoCodes = await stripe.promotionCodes.list({
      limit: 50,
      expand: ["data.promotion.coupon"],
    });

    const codes = promoCodes.data.map((pc) => {
      // pc.promotion.coupon can be string | Stripe.Coupon | null
      const coupon = pc.promotion?.coupon;
      const couponObj = typeof coupon === "object" && coupon !== null ? coupon : null;

      return {
        id: pc.id,
        code: pc.code,
        active: pc.active,
        timesRedeemed: pc.times_redeemed,
        maxRedemptions: pc.max_redemptions,
        expiresAt: pc.expires_at ? new Date(pc.expires_at * 1000).toISOString() : null,
        coupon: couponObj
          ? {
              id: couponObj.id,
              name: couponObj.name,
              percentOff: couponObj.percent_off,
              amountOff: couponObj.amount_off,
              currency: couponObj.currency,
              duration: couponObj.duration,
              durationInMonths: couponObj.duration_in_months,
              valid: couponObj.valid,
            }
          : {
              id: typeof coupon === "string" ? coupon : "",
              name: null,
              percentOff: null,
              amountOff: null,
              currency: null,
              duration: "once",
              durationInMonths: null,
              valid: true,
            },
      };
    });

    return NextResponse.json({ codes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch coupons", codes: [] },
      { status: 500 },
    );
  }
}

/** POST — create a new coupon + promotion code. */
export async function POST(request: Request) {
  const admin = await requireAdminApiAccess();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = await getConfiguredStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not connected. Add your keys first." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      code: string;
      percentOff?: number;
      amountOff?: number;
      currency?: string;
      duration?: "once" | "repeating" | "forever";
      durationInMonths?: number;
      maxRedemptions?: number;
      name?: string;
    };

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    if (!body.percentOff && !body.amountOff) {
      return NextResponse.json(
        { error: "Set either a percentage or fixed amount discount" },
        { status: 400 },
      );
    }

    // 1. Create the coupon (the discount rule)
    const couponParams: Stripe.CouponCreateParams = {
      name: body.name?.trim() || `Discount ${body.code.trim().toUpperCase()}`,
      duration: body.duration || "once",
    };

    if (body.percentOff) {
      couponParams.percent_off = Math.min(100, Math.max(1, body.percentOff));
    } else if (body.amountOff) {
      couponParams.amount_off = Math.max(1, Math.round(body.amountOff));
      couponParams.currency = body.currency || "gbp";
    }

    if (body.duration === "repeating" && body.durationInMonths) {
      couponParams.duration_in_months = Math.max(1, body.durationInMonths);
    }

    const coupon = await stripe.coupons.create(couponParams);

    // 2. Create the promotion code (the shareable code)
    const promoParams: Stripe.PromotionCodeCreateParams = {
      promotion: {
        type: "coupon",
        coupon: coupon.id,
      },
      code: body.code.trim().toUpperCase(),
    };

    if (body.maxRedemptions) {
      promoParams.max_redemptions = Math.max(1, body.maxRedemptions);
    }

    const promoCode = await stripe.promotionCodes.create(promoParams);

    return NextResponse.json({
      ok: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        active: promoCode.active,
        coupon: {
          id: coupon.id,
          name: coupon.name,
          percentOff: coupon.percent_off,
          amountOff: coupon.amount_off,
          currency: coupon.currency,
          duration: coupon.duration,
        },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create promo code";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
