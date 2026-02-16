import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "bw-session";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "kickablur@icloud.com").trim().toLowerCase();

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

/** API routes that must remain public (no session required). */
const PUBLIC_API_PREFIXES = [
  "/api/auth/",       // login, register, logout, nextauth
  "/api/register",    // legacy registration
  "/api/stripe/webhook", // Stripe webhook (verified by signature)
  "/api/contact",     // public contact form
  "/api/blog",        // public blog listing + individual posts
  "/api/alerts/active", // public alert polling (studio + unauthenticated)
];

/** Share token routes are public (readers don't need auth), but /api/share and /api/share/feedback are protected. */
function isPublicShareRoute(pathname: string): boolean {
  // Match /api/share/<token> and sub-routes like /api/share/<token>/annotate, /api/share/<token>/submit
  // But NOT /api/share (root) or /api/share/feedback (both need auth)
  const shareMatch = pathname.match(/^\/api\/share\/([^/]+)/);
  if (!shareMatch) return false;
  const segment = shareMatch[1];
  // "feedback" and "send-email" are authenticated routes, not tokens
  if (segment === "feedback" || segment === "send-email") return false;
  return true;
}

function isPublicApi(pathname: string): boolean {
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (isPublicShareRoute(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  // ── Public API routes pass through ──
  if (isApiRoute && isPublicApi(pathname)) {
    return NextResponse.next();
  }

  // ── Protected routes: /studio, /admin, /subscribe, AND all non-public /api/* ──
  // All require a valid bw-session. /admin additionally requires admin email.
  // Subscription enforcement for /studio is handled by app/studio/layout.tsx
  // (because Prisma can't run in Edge middleware).

  if (
    pathname.startsWith("/studio") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/subscribe") ||
    isApiRoute
  ) {
    const secret = process.env.BW_SESSION_SECRET;
    if (!secret) {
      return isApiRoute
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", request.url));
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return isApiRoute
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", request.url));
    }

    const email = await verifyToken(token, secret);
    if (!email) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Invalid or expired token — clear cookie and redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return response;
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") && email.toLowerCase() !== ADMIN_EMAIL) {
      return isApiRoute
        ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
        : NextResponse.redirect(new URL("/studio", request.url));
    }

    // Refresh cookie on every visit (pages only, not API)
    const response = NextResponse.next();
    if (!isApiRoute) {
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  }

  // ── Redirect logged-in users away from login page ──
  // Skip this redirect if there's a "reason" param (e.g. session-expired) —
  // the user was kicked from the studio and needs to re-authenticate.
  if (pathname === "/login") {
    const reason = request.nextUrl.searchParams.get("reason");
    if (reason) {
      // Clear the stale cookie so the user can log in fresh
      const response = NextResponse.next();
      response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return response;
    }
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
  matcher: ["/studio/:path*", "/admin/:path*", "/subscribe/:path*", "/api/:path*", "/login", "/share/:path*"],
};
