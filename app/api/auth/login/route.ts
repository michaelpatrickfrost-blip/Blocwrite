import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createSessionToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/bw-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const adminEmail = process.env.BW_ADMIN_EMAIL;
    const adminHash = process.env.BW_ADMIN_PASSWORD_HASH;

    console.log("[LOGIN DEBUG] adminEmail:", adminEmail);
    console.log("[LOGIN DEBUG] adminHash starts with:", adminHash?.slice(0, 10));
    console.log("[LOGIN DEBUG] adminHash length:", adminHash?.length);
    console.log("[LOGIN DEBUG] input email:", email);

    if (!adminEmail || !adminHash) {
      return NextResponse.json({ error: "Server configuration error — env vars missing." }, { status: 500 });
    }

    // Check email (case-insensitive)
    if (email.toLowerCase().trim() !== adminEmail.toLowerCase().trim()) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Check password
    const match = await bcrypt.compare(password, adminHash);
    console.log("[LOGIN DEBUG] bcrypt match:", match);
    if (!match) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Create signed token and set cookie
    const token = createSessionToken(email.toLowerCase().trim());
    const response = NextResponse.json({ ok: true });

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
