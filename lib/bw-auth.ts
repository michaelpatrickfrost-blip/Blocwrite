import { createHmac, randomUUID } from "crypto";

const COOKIE_NAME = "bw-session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

function getSecret(): string {
  const s = process.env.BW_SESSION_SECRET;
  if (!s) throw new Error("BW_SESSION_SECRET is not set");
  return s;
}

/** Sign a payload string with HMAC-SHA256. */
function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Create a signed session token for the given email. Includes a nonce for single-session enforcement. */
export function createSessionToken(email: string, nonce?: string): string {
  const exp = Date.now() + COOKIE_MAX_AGE * 1000;
  const payload = JSON.stringify({ email, exp, nonce: nonce ?? undefined });
  const sig = sign(payload);
  return Buffer.from(payload).toString("base64url") + "." + sig;
}

/** Verify a session token. Returns the email if valid, null otherwise. */
export function verifySessionToken(token: string): string | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payload = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const expected = sign(payload);
    if (sig !== expected) return null;
    const data = JSON.parse(payload) as { email?: string; exp?: number };
    if (!data.email || !data.exp) return null;
    if (Date.now() > data.exp) return null;
    return data.email;
  } catch {
    return null;
  }
}

/** Extract full payload from a valid token — email + nonce. Returns null if invalid. */
export function extractSessionPayload(token: string): { email: string; nonce?: string } | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payload = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const expected = sign(payload);
    if (sig !== expected) return null;
    const data = JSON.parse(payload) as { email?: string; exp?: number; nonce?: string };
    if (!data.email || !data.exp) return null;
    if (Date.now() > data.exp) return null;
    return { email: data.email, nonce: data.nonce };
  } catch {
    return null;
  }
}

/** Generate a fresh session nonce. */
export function generateSessionNonce(): string {
  return randomUUID();
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
