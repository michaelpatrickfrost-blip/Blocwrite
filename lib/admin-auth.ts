import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken, extractSessionPayload } from "@/lib/bw-auth";

const ADMIN_EMAIL = "kickablur@icloud.com";

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && email.trim().toLowerCase() === ADMIN_EMAIL);
}

export async function getSessionEmailFromCookies() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Get both email and nonce from the session cookie. */
export async function getSessionPayloadFromCookies() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return extractSessionPayload(token);
}

export async function requireAdminPageAccess() {
  const email = await getSessionEmailFromCookies();
  if (!isAdminEmail(email)) {
    redirect("/");
  }
  return email;
}

export async function requireAdminApiAccess() {
  const email = await getSessionEmailFromCookies();
  if (!isAdminEmail(email)) return null;
  return email;
}
