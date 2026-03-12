#!/bin/bash
# Deploy to production server and restart. Run from your Mac.
# Usage: DEPLOY_PASS="your-root-password" ./scripts/deploy-to-server.sh
#
# Optional: add to ~/.zshrc:
#   export DEPLOY_PASS="your-password"   # or use a password manager
#   alias deploy-blocwrite='cd /path/to/Blocwrite && ./scripts/deploy-to-server.sh'

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

if [ -z "$DEPLOY_PASS" ]; then
  echo "Error: Set DEPLOY_PASS environment variable with your server password."
  echo "  DEPLOY_PASS='yourpass' ./scripts/deploy-to-server.sh"
  exit 1
fi

echo "Deploying to 217.154.51.15 ..."
export DEPLOY_PASS
"$SCRIPT_DIR/deploy-remote.exp" "cd /opt/Blocwrite && git pull && npm install && npm run build && pm2 restart blocwrite"
echo ""
echo "Deploy complete. Server restarted."
