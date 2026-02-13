#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Building PilotWriter Desktop App   ║"
echo "╚══════════════════════════════════════╝"
echo ""

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ── Step 1: Build Next.js (standalone) ────────────────────────────
echo "→ Building Next.js..."
npx next build

# ── Step 2: Copy static + public into standalone ──────────────────
echo "→ Copying static assets..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# ── Step 3: Package with electron-builder ─────────────────────────
echo "→ Packaging DMG..."
npx electron-builder --mac --config electron-builder.yml

echo ""
echo "══════════════════════════════════════"
echo "  ✓ Done! DMG is in dist-electron/"
echo "══════════════════════════════════════"
echo ""
