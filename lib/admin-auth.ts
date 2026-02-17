import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken, extractSessionPayload } from "@/lib/bw-auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "kickablur@icloud.com").trim().toLowerCase();

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && email.trim().toLowerCase() === ADMIN_EMAIL);
}

/**
 * Check if a user has admin rights — either via env ADMIN_EMAIL or via
 * the isAdmin flag in the database.
 */
export async function isAdminUser(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === ADMIN_EMAIL) return true;
  try {
    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { isAdmin: true },
    });
    return user?.isAdmin === true;
  } catch {
    return false;
  }
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
  const admin = await isAdminUser(email);
  if (!admin) {
    redirect("/");
  }
  return email;
}

export async function requireAdminApiAccess() {
  const email = await getSessionEmailFromCookies();
  const admin = await isAdminUser(email);
  if (!admin) return null;
  return email;
}
