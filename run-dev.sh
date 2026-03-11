#!/bin/bash
# Use Node 20 LTS (Next.js works best with Node 18-22, not Node 25+)
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")"
echo "Generating Prisma client..."
npx prisma generate
echo ""
echo "Starting Next.js dev server..."
echo "Open http://localhost:3001 in your browser (may take 30-60s on first load)"
echo "Press Ctrl+C to stop"
echo ""
npm run dev
