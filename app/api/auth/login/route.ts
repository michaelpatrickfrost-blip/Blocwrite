import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { createSessionToken, generateSessionNonce, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/bw-auth";

// Admin credentials (preserved — admin always logs in with this password)
const ADMIN_EMAIL = "kickablur@icloud.com";
const ADMIN_HASH = "$2b$12$FEpsrmuLlPRCayHGoamab.ERBf4ZWM6xHzfz3t/OrOFtSV5inqije";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── 1. Admin login (hardcoded credentials) ──
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

    // Always send logins to /studio. Subscription access is enforced in the
    // studio server gate so users are not misrouted by transient checks here.
    const response = NextResponse.json({ ok: true, redirectTo: "/studio", mustChangePassword: !!user.mustChangePassword });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
