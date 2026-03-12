#!/usr/bin/env node
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

async function main() {
  const envPath = path.join(__dirname, "..", ".env");
  const env = fs.readFileSync(envPath, "utf8");
  const adminHash = env.match(/ADMIN_PASSWORD_HASH=(.+)/)?.[1]?.trim();
  console.log("ADMIN_PASSWORD_HASH set:", !!adminHash);
  if (adminHash) {
    const match = await bcrypt.compare("localdev123", adminHash);
    console.log("ADMIN_PASSWORD_HASH matches localdev123:", match);
  }

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { email: "kickablur@icloud.com" },
    select: { passwordHash: true },
  });
  await prisma.$disconnect();

  console.log("User in DB:", !!user);
  if (user?.passwordHash) {
    const match = await bcrypt.compare("localdev123", user.passwordHash);
    console.log("DB passwordHash matches localdev123:", match);
  }
}

main().catch(console.error);
