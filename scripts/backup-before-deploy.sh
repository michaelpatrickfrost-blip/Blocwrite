#!/bin/bash
# Backup novels data + database before deploy. Run on server (or locally) before deploying.
# Usage: ./scripts/backup-before-deploy.sh [backup-dir]

set -e
BACKUP_DIR="${1:-./backups}"
STAMP=$(date +%Y%m%d-%H%M%S)
DEST="$BACKUP_DIR/pre-deploy-$STAMP"

mkdir -p "$DEST"

echo "Backing up to $DEST ..."

# 1. Novels (JSON files) - CRITICAL: all user novel data
if [ -d "data" ]; then
  cp -a data "$DEST/data"
  echo "  ✓ data/ (novels)"
else
  echo "  - data/ not found (skip)"
fi

# 2. Prisma DB (auth, subscriptions, share links)
DB_PATH="${DATABASE_URL:-}"
if [ -z "$DB_PATH" ]; then
  if [ -f "prisma/dev.db" ]; then
    cp -a prisma/dev.db "$DEST/prisma-dev.db"
    echo "  ✓ prisma/dev.db"
  else
    echo "  - prisma/dev.db not found (if using Postgres, back up manually)"
  fi
else
  echo "  ! DATABASE_URL is set - back up your Postgres/DB manually"
fi

echo ""
echo "Backup saved to: $DEST"
echo "Keep this until you confirm the deploy works."
