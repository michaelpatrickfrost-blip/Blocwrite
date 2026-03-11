# AGENTS.md

## Cursor Cloud specific instructions

**Project**: Blocwrite / PilotWriter — an AI-powered writing studio for novelists built with Next.js 15 (App Router), Prisma (SQLite), and TipTap editor.

### Running the app

- `npm run dev` starts the Next.js dev server on port 3000.
- The `.env` file must contain at minimum: `DATABASE_URL`, `BW_SESSION_SECRET`, and `NEXTAUTH_SECRET`. See the `.env` file in the repo root for current values.
- After installing dependencies, run `npx prisma migrate dev` to ensure the SQLite database is up to date, then `npx prisma generate` if the Prisma client is stale.

### Auth and subscription bypass for development

- The subscription gate in `lib/subscription-gate.ts` has the admin email **hardcoded** as `kickablur@icloud.com`. The `ADMIN_EMAIL` env var is used by `middleware.ts` and some API routes, but **not** by the subscription gate.
- To bypass the paywall for a dev user, grant `GuestAccess` with `duration: "forever"` in the database directly (e.g., via `npx prisma studio` or a script). The `ADMIN_EMAIL` env var alone is **not sufficient** to bypass the studio subscription check.

### Novel data storage

- Novel content is stored as JSON files on the filesystem under `data/` (not in the database). Each user gets an isolated subdirectory via email hash. The admin email uses `data/` directly.
- The Prisma/SQLite database handles users, sessions, subscriptions, share links, blog posts, and admin features.

### Known issues

- **ESLint**: `npm run lint` fails with an ESM resolution error (`eslint-config-next/core-web-vitals` without `.js` extension). This is a pre-existing issue with `eslint-config-next@15.5.12` lacking an `exports` map. The `next build` command skips linting and succeeds.
- **Editor page size**: `app/studio/[novelId]/page.tsx` is ~1.4 MB. First load in dev mode triggers a long compilation (~15s). In resource-constrained environments, Chrome may crash (Error code: 4) if too many tabs/processes compete for memory.

### Build and test

- `npm run build` — production build (succeeds; skips lint via `eslint.ignoreDuringBuilds: true` in `next.config.ts`).
- `npm run lint` — runs ESLint (currently broken due to config issue above).
- No automated test suite exists in this repository.
