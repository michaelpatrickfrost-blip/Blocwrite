import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "bw-session";
const ADMIN_EMAIL = "kickablur@icloud.com";

/** HMAC-SHA256 sign using Web Crypto API (Edge-compatible). */
async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Verify the bw-session token. Returns email if valid, null otherwise. */
async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const dotIdx = token.indexOf(".");
    if (dotIdx === -1) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const payload = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const expected = await hmacSign(payload, secret);
    if (sig !== expected) return null;
    const data = JSON.parse(payload) as { email?: string; exp?: number };
    if (!data.email || !data.exp) return null;
    if (Date.now() > data.exp) return null;
    return data.email;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Protected routes: /studio, /admin, /subscribe ──
  // All require a valid bw-session. /admin additionally requires admin email.
  // Subscription enforcement for /studio is handled by app/studio/layout.tsx
  // (because Prisma can't run in Edge middleware).

  if (
    pathname.startsWith("/studio") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/subscribe")
  ) {
    const secret = process.env.BW_SESSION_SECRET;
    if (!secret) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const email = await verifyToken(token, secret);
    if (!email) {
      // Invalid or expired token — clear cookie and redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return response;
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") && email.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.redirect(new URL("/studio", request.url));
    }

    // Refresh cookie on every visit
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  // ── Redirect logged-in users away from login page ──
  if (pathname === "/login") {
    const secret = process.env.BW_SESSION_SECRET;
    if (secret) {
      const token = request.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        const email = await verifyToken(token, secret);
        if (email) {
          // Already logged in — send to studio
          return NextResponse.redirect(new URL("/studio", request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/admin/:path*", "/subscribe/:path*", "/login"],
};
