import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, extractSessionPayload } from "@/lib/bw-auth";

/**
 * GET /api/auth/validate-session
 * Returns { valid: true/false } — checks if the current session token's nonce
 * matches the DB. Used by the client to detect when a user logged in elsewhere.
 */
export async function GET() {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ valid: false, reason: "no-token" });
    }

    const payload = extractSessionPayload(token);
    if (!payload) {
      return NextResponse.json({ valid: false, reason: "invalid-token" });
    }

    // If no nonce in token (old token before this feature), still valid
    if (!payload.nonce) {
      return NextResponse.json({ valid: true });
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase().trim() },
      select: { sessionNonce: true },
    });

    if (!user) {
      return NextResponse.json({ valid: false, reason: "user-not-found" });
    }

    if (user.sessionNonce && user.sessionNonce !== payload.nonce) {
      return NextResponse.json({ valid: false, reason: "session-replaced" });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false, reason: "error" });
  }
}
