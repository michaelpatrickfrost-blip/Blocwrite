#!/usr/bin/env node

// ─── PilotWriter Serial Code Generator ──────────────────────────────
// Usage:  node scripts/generate-serial.js [count]
// Generates valid PW26-XXXX-XXXX-XXXX serial codes.

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function validateSerial(raw) {
  const s = raw.replace(/[\s-]/g, "").toUpperCase();
  if (!/^PW[A-Z0-9]{14}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += s.charCodeAt(i);
  }
  return sum % 31 === 0;
}

function generateSerial() {
  // Start with PW26, then fill 12 random chars, adjust last char to fix checksum
  const prefix = "PW26";
  for (let attempt = 0; attempt < 10000; attempt++) {
    let body = "";
    for (let i = 0; i < 11; i++) body += randomChar();

    // Calculate current sum with 15 chars, find the 16th char to make sum % 31 === 0
    const partial = prefix + body;
    let sum = 0;
    for (let i = 0; i < partial.length; i++) {
      sum += partial.charCodeAt(i);
    }
    const remainder = sum % 31;
    const needed = remainder === 0 ? 0 : 31 - remainder;

    // Find a char in CHARS whose ASCII code gives the right remainder
    for (const c of CHARS) {
      if (c.charCodeAt(0) % 31 === needed) {
        const serial = partial + c;
        if (validateSerial(serial)) {
          return serial.slice(0, 4) + "-" + serial.slice(4, 8) + "-" + serial.slice(8, 12) + "-" + serial.slice(12, 16);
        }
      }
    }
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────
const count = Math.max(1, parseInt(process.argv[2] || "5", 10));

console.log("");
console.log("╔═══════════════════════════════════════╗");
console.log("║   PilotWriter Serial Code Generator   ║");
console.log("╚═══════════════════════════════════════╝");
console.log("");

for (let i = 0; i < count; i++) {
  const serial = generateSerial();
  if (serial) {
    console.log(`  ${i + 1}. ${serial}`);
  } else {
    console.log(`  ${i + 1}. (generation failed — retry)`);
  }
}

console.log("");
console.log("Copy any code above and use it to activate PilotWriter.");
console.log("");
