import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { createSessionToken, generateSessionNonce, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/bw-auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/redeem-trial
 * Redeem a trial code. Creates a user account, grants 30-day guest access, logs them in.
 * Body: { code: string, password: string }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string; password?: string };
    const code = body.code?.trim().toUpperCase();
    const password = body.password?.trim();

    if (!code || !password) {
      return NextResponse.json({ error: "Code and password are required." }, { status: 400 });
    }

    const trial = await prisma.trialCode.findUnique({ where: { code } });

    if (!trial) {
      return NextResponse.json({ error: "Invalid trial code." }, { status: 401 });
    }

    if (trial.redeemedBy) {
      return NextResponse.json({ error: "This trial code has already been used." }, { status: 401 });
    }

    if (trial.expiresAt < new Date()) {
      return NextResponse.json({ error: "This trial code has expired." }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, trial.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid password for this trial code." }, { status: 401 });
    }

    // Create a user account for this trial
    const trialEmail = `trial-${code.toLowerCase()}@blocwrite.trial`;
    const userPasswordHash = await bcrypt.hash(password, 12);
    const nonce = generateSessionNonce();

    // Check if a user with this trial email already exists (edge case: code somehow redeemed before)
    let user = await prisma.user.findUnique({
      where: { email: trialEmail },
      select: { id: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: trialEmail,
          name: trial.note ? `Trial: ${trial.note}` : "Trial User",
          passwordHash: userPasswordHash,
          sessionNonce: nonce,
        },
        select: { id: true },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { sessionNonce: nonce, passwordHash: userPasswordHash },
      });
    }

    // Grant 30-day guest access
    const accessExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.guestAccess.upsert({
      where: { userId: user.id },
      update: { duration: "1month", expiresAt: accessExpiry, grantedBy: "trial-code" },
      create: { userId: user.id, duration: "1month", expiresAt: accessExpiry, grantedBy: "trial-code" },
    });

    // Mark the trial code as redeemed
    await prisma.trialCode.update({
      where: { code },
      data: { redeemedBy: trialEmail, redeemedAt: new Date() },
    });

    // Create session and log them in
    const token = createSessionToken(trialEmail, nonce);
    const response = NextResponse.json({ ok: true, redirectTo: "/studio" });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Redeem trial error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
