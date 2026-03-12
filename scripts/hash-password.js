#!/usr/bin/env node
/**
 * Generate bcrypt hash for admin password. Use in .env as ADMIN_PASSWORD_HASH.
 * Run: node scripts/hash-password.js "yourpassword"
 */
const bcrypt = require("bcrypt");
const pass = process.argv[2] || "localdev123";
bcrypt.hash(pass, 12).then((h) => console.log(h));
