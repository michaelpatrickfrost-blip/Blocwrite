#!/usr/bin/env node
/**
 * One-time script to create a local dev user with guest access.
 * Run: node scripts/seed-local-user.js
 * Then log in with: local@blocwrite.dev / localdev123
 * No app code changes — this just seeds the database.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const EMAIL = "local@blocwrite.dev";
const PASSWORD = "localdev123";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash: hash },
    create: {
      email: EMAIL,
      name: "Local Dev",
      passwordHash: hash,
    },
  });

  await prisma.guestAccess.upsert({
    where: { userId: user.id },
    update: { duration: "forever", expiresAt: null, grantedBy: "seed" },
    create: {
      userId: user.id,
      duration: "forever",
      grantedBy: "seed",
    },
  });

  console.log("Local dev user ready.");
  console.log("Email:", EMAIL);
  console.log("Password:", PASSWORD);
  console.log("Log in at http://localhost:3000/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
