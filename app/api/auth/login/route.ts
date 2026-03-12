import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { createSessionToken, generateSessionNonce, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/bw-auth";
import { hasActiveSubscription } from "@/lib/subscription-gate";

// Admin credentials
const ADMIN_EMAIL = "kickablur@icloud.com";
const ADMIN_HASH = "$2b$12$orXgbi6dT.q6mcyTKRI5ZukoqYQLgWcHrJvZb8T6Oajb3WJ4PX9N2"; // localdev123

// Local dev user — works without running seed script
const DEV_EMAIL = "local@blocwrite.dev";
const DEV_HASH = "$2b$12$orXgbi6dT.q6mcyTKRI5ZukoqYQLgWcHrJvZb8T6Oajb3WJ4PX9N2"; // localdev123

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── 1. Admin login ──
    if (normalizedEmail === ADMIN_EMAIL) {
      const match = await bcrypt.compare(password, ADMIN_HASH);
      if (!match) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      // Generate nonce and store it (upsert admin user)
      const nonce = generateSessionNonce();
      await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: { sessionNonce: nonce },
        create: { email: normalizedEmail, name: "Admin", isAdmin: true, sessionNonce: nonce },
      });

      const token = createSessionToken(normalizedEmail, nonce);
      const response = NextResponse.json({ ok: true, redirectTo: "/studio" });
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
      return response;
    }

    // ── 1b. Local dev login (local@blocwrite.dev / localdev123) — always redirects to studio ──
    if (normalizedEmail === DEV_EMAIL) {
      const match = await bcrypt.compare(password, DEV_HASH);
      if (!match) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
      const nonce = generateSessionNonce();
      const user = await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: { sessionNonce: nonce },
        create: { email: normalizedEmail, name: "Local Dev", passwordHash: DEV_HASH, sessionNonce: nonce },
      });
      await prisma.guestAccess.upsert({
        where: { userId: user.id },
        update: { duration: "forever", expiresAt: null, grantedBy: "seed" },
        create: { userId: user.id, duration: "forever", grantedBy: "seed" },
      });
      const token = createSessionToken(normalizedEmail, nonce);
      const res = NextResponse.json({ ok: true, redirectTo: "/studio" });
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
      return res;
    }

    // ── 2. Regular user login (Prisma lookup) ──
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, passwordHash: true, sessionNonce: true, mustChangePassword: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Always rotate nonce on successful login — newest session wins and
    // prior devices are transparently signed out.
    const nonce = generateSessionNonce();
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionNonce: nonce },
    });

    // Create session with nonce
    const token = createSessionToken(normalizedEmail, nonce);

    // Route users based on live access status: active/trial/guest -> studio, else subscribe.
    // If subscription check fails (Stripe/DB error), allow through to studio so users aren't locked out;
    // studio layout will re-check and show paywall if needed.
    let redirectTo: string;
    try {
      const hasSub = await hasActiveSubscription(normalizedEmail);
      redirectTo = hasSub ? "/studio" : "/subscribe";
    } catch {
      redirectTo = "/studio";
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo,
      mustChangePassword: !!user.mustChangePassword,
    });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (err) {
    // Don't lock users out: surface config errors in development
    const message = err instanceof Error && process.env.NODE_ENV !== "production"
      ? err.message
      : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
