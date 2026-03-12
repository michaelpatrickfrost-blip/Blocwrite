# Safe deployment checklist

Use this checklist before deploying to keep existing users' novels safe.

## Where user data lives

- **Novels** → `data/` folder (JSON files per user)
- **Auth, subscriptions, share links** → Prisma database (SQLite `prisma/dev.db` or Postgres via `DATABASE_URL`)

Novel content is **not** in the database; it's in `data/users/{hash}/novels.json`. The app has backward-compatible loading (`normalizeNovel`, `coerce`) so older novel shapes should continue to work.

---

## Before deploy

1. **Backup** (on the server, before pulling new code):
   ```bash
   chmod +x scripts/backup-before-deploy.sh
   ./scripts/backup-before-deploy.sh
   ```
   This creates `backups/pre-deploy-YYYYMMDD-HHMMSS/` with:
   - `data/` (all novels)
   - `prisma-dev.db` (if using local SQLite)

2. **Ensure `.env` is configured** on the server (same as current, or updated if needed).

---

## Deploy steps

1. **Build locally** (optional, to catch errors first):
   ```bash
   npm run build
   ```

2. **On the server** (or via your host: Vercel, Railway, etc.):
   - Pull the new code
   - Run `npm install` (or your package manager)
   - Run `prisma generate` (part of `postinstall`)
   - Run `prisma migrate deploy` (if you added migrations)
   - Run `npm run build && npm start` (or your start command)

3. **Do not delete or overwrite** the `data/` folder on the server.

---

## Rollback (if something breaks)

1. Restore from backup:
   ```bash
   cp -a backups/pre-deploy-YYYYMMDD-HHMMSS/data ./data
   # and prisma DB if needed
   ```
2. Revert to the previous commit and redeploy.

---

## Notes

- No Prisma schema changes were made in this session; `prisma migrate deploy` may not be needed.
- **Important:** The app writes novels to `data/` on disk. Vercel and many serverless hosts use ephemeral filesystems, so `data/` would not persist. You need a host with a persistent filesystem (VPS, Railway with volume, etc.) or you'd need to migrate novel storage to a database/object store.
