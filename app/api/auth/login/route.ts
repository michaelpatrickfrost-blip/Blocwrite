import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createSessionToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/bw-auth";

// Single-user credentials — hash generated from bcrypt.hash("Norman1981!", 12)
const ADMIN_EMAIL = "kickablur@icloud.com";
const ADMIN_HASH = "$2b$12$FEpsrmuLlPRCayHGoamab.ERBf4ZWM6xHzfz3t/OrOFtSV5inqije";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Check email (case-insensitive)
    if (email.toLowerCase().trim() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Check password
    const match = await bcrypt.compare(password, ADMIN_HASH);
    if (!match) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Create signed token and set cookie
    const token = createSessionToken(email.toLowerCase().trim());
    const normalizedEmail = email.toLowerCase().trim();
    const response = NextResponse.json({
      ok: true,
      redirectTo: normalizedEmail === ADMIN_EMAIL ? "/admin" : "/studio",
    });

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
