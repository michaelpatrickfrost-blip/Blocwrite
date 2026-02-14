import { prisma } from "@/lib/prisma";
import { getSessionEmailFromCookies, isAdminEmail } from "@/lib/admin-auth";

export async function getBwSessionEmailOrNull() {
  const email = await getSessionEmailFromCookies();
  return email ? email.trim().toLowerCase() : null;
}

export async function requireBwSessionEmailOrNull() {
  return getBwSessionEmailOrNull();
}

export async function ensurePrismaUserForSessionEmail() {
  const email = await getBwSessionEmailOrNull();
  if (!email) return null;
  const admin = isAdminEmail(email);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      isAdmin: admin,
    },
    create: {
      email,
      name: admin ? "Admin" : undefined,
      isAdmin: admin,
    },
    select: {
      id: true,
      email: true,
      stripeCustomer: { select: { stripeCustomerId: true } },
    },
  });
  return user;
}
