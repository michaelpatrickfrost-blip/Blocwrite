#!/usr/bin/env node
/**
 * Ensure admin (kickablur@icloud.com) can login.
 * Sets passwordHash in User table so they can login via regular path.
 * Run on server: node scripts/fix-admin-login.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const ADMIN_EMAIL = "kickablur@icloud.com";
const PASSWORD = process.argv[2] || "localdev123";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: hash, isAdmin: true },
    create: {
      email: ADMIN_EMAIL,
      name: "Admin",
      passwordHash: hash,
      isAdmin: true,
    },
  });
  console.log("OK: Admin", user.email, "can now login with password:", PASSWORD);
}

main().catch(console.error).finally(() => prisma.$disconnect());
