# Deployment Guide

> Last updated: 2026-08-13

This document covers everything needed to deploy, update, and troubleshoot the Life App on Railway.

---

## Overview

The app runs as a Docker container on Railway. SQLite is the database and lives on a persistent volume mounted at `/data`. Every time the container boots, `apply-schema.js` runs first to create any missing tables and columns — it is fully idempotent, so it is safe to run on every restart.

```
GitHub push to master
       │
       ▼
Railway builds Dockerfile (3-stage Debian slim build)
       │
       ▼
Container starts as root → chown /data → gosu → nextjs user
       │
       ├─ node apply-schema.js   (creates tables, bootstraps admin if needed)
       │
       └─ node server.js         (Next.js standalone server on port 3000)
```

**Production URL**: `https://life-app-production-938a.up.railway.app`

---

## Environment Variables

Set these in the Railway dashboard under your service → **Variables**.

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Random secret for signing JWT session tokens. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DB_PATH` | Yes | Path to the SQLite file. Must be `/data/life-app.db` when using the Railway volume. |
| `NEXTAUTH_URL` | Yes | Public HTTPS URL of the app, e.g. `https://life-app-production-938a.up.railway.app` |
| `AUTH_TRUST_HOST` | Yes | Must be `true`. NextAuth v5 requires this when running behind Railway's reverse proxy, otherwise it throws `UntrustedHost`. |
| `PORT` | Yes | Must be `3000`. Railway assigns a dynamic port by default which conflicts with the Dockerfile `EXPOSE 3000`. |
| `ADMIN_USERNAME` | First deploy only | Username for the auto-bootstrapped admin account. Only used if no users exist in the database. |
| `ADMIN_PASSWORD` | First deploy only | Password for the auto-bootstrapped admin account. Hashed with bcrypt before storage. |

### Life App 2.0 variables

Set these when deploying Garmin sync and the morning email digest.

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | Yes (2.0) | 32 random bytes, base64-encoded. Encrypts Garmin session tokens at rest. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `CRON_SECRET` | Yes (2.0) | Random string. The Railway cron service sends this in the `x-cron-secret` header when calling `POST /api/cron/morning-digest`. |
| `GMAIL_USER` | Yes (digest) | Gmail address used as the sender (`"Life App" <you@gmail.com>`). |
| `GMAIL_APP_PASSWORD` | Yes (digest) | Gmail App Password for Nodemailer — not your regular Gmail password. |

> **Windows local dev note**: `garmin-connect-client` depends on `node-libcurl-ja3`, which only supports Linux/macOS. `npm install` on Windows may skip this optional dependency. Garmin connect/sync works in Docker (Linux) and on Railway. Use `docker compose up` for full Garmin testing on Windows, or test Garmin in production after deploy.

> After the admin account is created, `ADMIN_USERNAME` and `ADMIN_PASSWORD` can be removed from Railway variables — they are no longer needed and leaving them in is harmless but unnecessary.

### Gmail setup (morning digest)

1. Enable 2-Step Verification on the Gmail account you will send from.
2. Go to Google Account → **Security** → **2-Step Verification** → **App passwords**.
3. Create an app password for **Mail** / **Other** (name it "Life App").
4. Set `GMAIL_USER` to that Gmail address and `GMAIL_APP_PASSWORD` to the 16-character app password.

### Morning digest cron (Railway dashboard)

Railway cron is a **separate service** — do **not** add a cron schedule to `railway.toml` (the web service never exits, so Railway would skip cron runs forever).

1. In the same Railway project, create a **new service** (no repo — start command only):
   ```bash
   curl -fsS -X POST https://<public-app-url>/api/cron/morning-digest -H "x-cron-secret: $CRON_SECRET"
   ```
   Use your **public** app URL — a separate container cannot reach the web service via `localhost`.
2. Set **Cron Schedule** to `0 5,6 * * *` (05:00 and 06:00 UTC daily).
3. Add env var `CRON_SECRET` on the cron service — same value as the web service.

**Why two UTC runs:** Brussels is UTC+1 in winter and UTC+2 in summer. The endpoint only sends when local time is ≥ 07:00, and `last_digest_sent_at` prevents double-sends:

| Season | 05:00 UTC | 06:00 UTC |
|--------|-----------|-----------|
| Summer (CEST) | 07:00 Brussels → sends | 08:00 → no-op (already sent) |
| Winter (CET) | 06:00 → gate rejects | 07:00 → sends |

### Testing the digest manually

```bash
curl -fsS -X POST https://your-app.railway.app/api/cron/morning-digest \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Locally (Docker), call `http://localhost:3000/api/cron/morning-digest` with the same header. The Brussels time gate applies — before 07:00 Brussels you get `{ "sent": 0, "skipped": "too early" }`.

---

## First Deploy (Railway Setup)

Follow these steps in order when setting up a fresh Railway deployment.

### 1. Create the Railway Project

1. Go to [railway.app](https://railway.app) and log in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select the `life-app` repository.

### 2. Set the Root Directory

Railway needs to build from `Life App/`, not the repo root (where there is no Dockerfile).

1. Go to your service → **Settings** → **Source**.
2. Set **Root Directory** to `Life App`.
3. Save. Railway will now detect the `Dockerfile` correctly.

### 3. Set Environment Variables

Go to your service → **Variables** and add all variables from the table above.

### 4. Add the Persistent Volume

Without a volume, the SQLite database is lost on every redeploy.

1. Go to your service → **Volumes** (or **Settings** → **Volumes**).
2. Click **Add Volume**.
3. Set **Mount Path** to `/data`.
4. Save.

### 5. Deploy

Trigger a deploy (or push to `master` — Railway deploys automatically on every push to the connected branch).

### 6. Verify

1. Visit the public URL → you should see the login page.
2. Log in with the credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
3. Navigate around the app — all sections should load.
4. Restart the service (Railway dashboard → **Restart**) and confirm data is still present.

---

## Redeploying After Code Changes

Redeployment is automatic: push to `master` on GitHub and Railway rebuilds and redeploys.

```bash
git add -A
git commit -m "your change"
git push origin master
```

- `apply-schema.js` runs on every boot and is **idempotent** — it uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS` so it is always safe to run.
- No manual migration step is needed. Schema changes go through `apply-schema.js`, not Drizzle's `migrate` command in production.
- The SQLite volume at `/data` is preserved across redeploys.

---

## How `apply-schema.js` Works

The script runs as the first process on every container start. It performs three steps:

1. **Create tables** — `CREATE TABLE IF NOT EXISTS` for every table in the schema. Safe to run repeatedly.
2. **Add columns** — `ALTER TABLE ADD COLUMN IF NOT EXISTS` for columns added in later features. If the column already exists, the statement is skipped.
3. **Bootstrap admin** — If `ADMIN_USERNAME` and `ADMIN_PASSWORD` env vars are set **and** the `users` table is empty, the script creates a hashed admin account. This only fires on the very first boot of a fresh database.

> Do not run `npx drizzle-kit migrate` in production. That command depends on Drizzle's migration tracking table and is only used in local development. Production always uses `apply-schema.js`.

---

## Container Security

The Dockerfile uses a privilege-drop pattern to solve a conflict between Railway volumes (mounted as root) and running app code as an unprivileged user:

```
# Container starts as root (no USER instruction before CMD)
CMD ["sh", "-c", "chown -R nextjs:nodejs /data && gosu nextjs sh -c 'node apply-schema.js && node server.js'"]
```

- **Root phase**: `chown -R nextjs:nodejs /data` — fixes ownership of the Railway-mounted volume so the `nextjs` user can write to it.
- **Drop privileges**: `gosu nextjs` — drops from root (UID 0) to `nextjs` (UID 1001) before any app code runs.
- **App phase**: Both `apply-schema.js` and `server.js` run as the unprivileged `nextjs` user.

The `nextjs` user and `nodejs` group are created in the Dockerfile runner stage:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends gosu libcurl4 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
```

### Why Debian slim, not Alpine

`garmin-connect-client` depends on `node-libcurl-ja3`, a native addon that requires glibc and libcurl at runtime. Alpine uses musl libc and its prebuilt binaries are not compatible. Switching to `node:20-slim` (Debian) gives us glibc, standard libcurl (`libcurl4`), and prebuilt binary support for all native addons.

**Do not switch back to Alpine** without testing that all native addons (`better-sqlite3`, `garmin-connect-client`) build and run correctly.

---

## Admin Account Management

Accounts are managed via the `/admin/users` page (admin-only). There is no public registration.

- **Create a user**: fill in username + password on the admin page → the user can log in immediately.
- **Deactivate a user**: toggle the active switch → they cannot log in until reactivated.
- **The last active admin cannot be deactivated** — the API enforces this constraint.

To create the very first admin on a fresh database, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` as Railway environment variables before the first deploy. The `apply-schema.js` script handles the rest.

---

## Health Check

Railway monitors the app using the `/api/health` endpoint defined in `railway.toml`:

```toml
[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 120
```

- The endpoint is **public** (no authentication required) so Railway can check it without a session.
- The 120-second timeout accounts for the `apply-schema.js` run time on first boot.

## Database Backups

Daily SQLite backups are handled by `src/instrumentation.ts` (the Next.js server instrumentation hook), which runs `runDailyBackup()` once on process startup and every 24 hours thereafter. This replaces the previous approach of triggering backup from `GET /api/health`.

- Backups are written to the `backups/` directory on the same volume as `life-app.db`.
- The backup function is idempotent — it skips if today's backup file already exists.
- Admins can also trigger a manual backup via `POST /api/admin/backup` (requires admin session).

---

## Troubleshooting

### 502 "Application failed to respond"

The container built successfully but crashed at runtime. Check the deploy logs in Railway.

**Common causes**:

| Symptom in logs | Cause | Fix |
|-----------------|-------|-----|
| `no such table: users` | `apply-schema.js` did not run | Check Dockerfile CMD — must run `node apply-schema.js && node server.js` |
| `Cannot find module 'bcryptjs'` | `bcryptjs` not copied to runner stage | Add `COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs` to Dockerfile |
| `Module not found: Can't resolve 'deasync'` | `garmin-connect-client` not in `serverExternalPackages` | Add `"garmin-connect-client"`, `"deasync"`, `"node-libcurl-ja3"` to `serverExternalPackages` in `next.config.ts` |
| `npm ci` fails with `Missing: undici` | Lock file generated by npm v11 (Node 24) incompatible with npm v10 (Node 20 in Docker) | Use `npm install` in Dockerfile instead of `npm ci`, or regenerate the lock file inside a Node 20 container |
| `UntrustedHost` | NextAuth v5 rejects the request host | Add `AUTH_TRUST_HOST=true` to Railway variables |
| Port mismatch | App starts on wrong port | Add `PORT=3000` to Railway variables |

### `SqliteError: unable to open database file`

The container cannot write to `/data/life-app.db`.

**Causes**:
- No volume attached — add a volume at `/data` in Railway.
- Volume mounted as root but app running as non-root — the `chown` in the CMD startup handles this; if it is missing, the Dockerfile CMD has been modified incorrectly.

### Healthcheck fails / service stays "deploying"

- Check that `PORT=3000` is set.
- Check that `AUTH_TRUST_HOST=true` is set.
- The healthcheck timeout is 120 seconds — on first boot with a large schema, `apply-schema.js` can take a few seconds. If it consistently times out, check deploy logs for errors in `apply-schema.js`.

### User cannot log in after deploy

- Confirm the user account is **active** (check `/admin/users`).
- Confirm `NEXTAUTH_URL` matches the exact public URL (including `https://`, no trailing slash).
- Confirm `AUTH_SECRET` is set and has not changed — changing it invalidates all existing sessions.

---

## Local Development vs. Production

| Concern | Local | Production (Railway) |
|---------|-------|----------------------|
| Database path | `./life-app.db` (project root) | `/data/life-app.db` (volume) |
| Migrations | `npx drizzle-kit generate` + `node apply-schema.js` | `apply-schema.js` runs automatically on boot |
| Admin creation | `npx tsx src/scripts/create-admin.ts` | `ADMIN_USERNAME` + `ADMIN_PASSWORD` env vars |
| Auth URL | `http://localhost:3000` | `https://life-app-production-938a.up.railway.app` |
| `AUTH_TRUST_HOST` | Not needed | `true` (required) |
| HTTPS | Not applicable | Handled automatically by Railway |
