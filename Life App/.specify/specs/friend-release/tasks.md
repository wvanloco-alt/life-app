# Tasks: Friend Release (Multi-User)

**Spec**: `.specify/specs/friend-release/spec.md`
**Status**: Complete
**Last updated**: 2026-03-21

---

## Overview

This is the largest architectural change the app has ever gone through. It touches every table in the schema and every API route. We do it in strict phases so the app stays functional at each checkpoint.

**Total estimated effort**: 4–6 focused sessions.

---

## Phase 1: Auth Foundation

**Purpose**: Install NextAuth.js, create the users table, and wire up the login flow. No data isolation yet — we just need auth to work.

- [x] T001 Install dependencies: `npm install next-auth@beta bcryptjs` and `npm install -D @types/bcryptjs` in `Life App/`
- [x] T002 Add `users` table to `src/db/schema.ts`:
  - columns: `id` (text, primary key, UUID), `username` (text, unique, not null), `passwordHash` (text, not null), `role` (text, default `"user"`), `isActive` (boolean, default `true`), `createdAt`
- [x] T003 Create Drizzle migration for the `users` table: `npm run db:generate` then `npm run db:migrate` in `Life App/`
- [x] T004 Create `src/lib/auth.ts` — NextAuth config with Credentials provider. Validates username/password against `users` table using bcryptjs. Session includes `user.id` and `user.role`.
- [x] T005 Create `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler (GET and POST exports).
- [x] T006 Create `src/app/login/page.tsx` — simple login form (username + password inputs, submit button). Calls `signIn("credentials", ...)` from NextAuth. Shows error on failure.
- [x] T007 Create `src/middleware.ts` — protects all routes except `/login` and `/api/auth/*`. Redirects unauthenticated requests to `/login`.
- [x] T008 Add `SessionProvider` wrapper to `src/app/layout.tsx` so session is available app-wide.
- [x] T009 Add a "Log out" button to `src/components/layout/app-sidebar.tsx` that calls `signOut()`.
- [x] T010 Create a seed script `src/scripts/create-admin.ts` that creates the first admin user (you) with a hashed password. Run once: `npx tsx src/scripts/create-admin.ts`.

**Checkpoint**: Start the app. You should see the login page. Log in with the admin account. The full app loads. Log out. You are back on the login page. Trying to visit `/today` without login redirects to `/login`. ✓

---

## Phase 2: Per-User Data Isolation — Schema

**Purpose**: Add `user_id` to every data table. No API logic changes yet — just the schema migration.

- [x] T011 Add `userId` column (`text("user_id").notNull().default("")`) to these tables in `src/db/schema.ts`:
  - `roles`
  - `weeklyPlans` (confirmed still exists in schema — v2 renamed the route `/weekly-plan → /monthly-plan` but kept the table)
  - `goals`
  - `activities`
  - `recurringActivities`
  - `schedulerSettings`
  - `schedulerBlackoutDates`
  - `activityTypes`
  - `activityLogs`
  - `bodyMetrics`
  - `budgetSettings`
  - `incomeEntries`
  - `fixedCosts`
  - `spendingEntries`
  - `spendingCategories`
  - `plannedExpenses`
  - `trainingPlans`

  **Note**: Junction tables (`goalRoles`, `goalTallies`, `goalSessionPatterns`, `weeklyFocusGoals`, `trainingPhases`) do NOT need `user_id` — they are always accessed via their parent table's FK.

  **Additional fix**: Removed `.unique()` constraint from `weeklyPlans.weekStartDate` to allow multiple users to have plans for the same week.

- [x] T012 Generate and run migration: `npm run db:generate` then `npm run db:migrate`. Existing rows will get `user_id = ""` (the default). We will backfill in T013.
- [x] T013 Create a one-time backfill script `src/scripts/backfill-user-id.ts` that sets `user_id = <your admin user ID>` on all existing rows in all tables from T011. Run it once after migration: `npx tsx src/scripts/backfill-user-id.ts`.

**Checkpoint**: App still loads and shows your data (backfilled to your user ID). No other user exists yet so nothing changes visually. ✓

---

## Phase 3: Per-User Data Isolation — API Routes

**Purpose**: Update every API route to read `session.user.id` and scope all queries with `WHERE user_id = session.user.id`. This is the largest phase.

**Pattern for every route**:
```ts
import { auth } from "@/lib/auth";
const session = await auth();
if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
// Then add .where(eq(table.userId, userId)) to every query
// And add userId to every INSERT
```

- [x] T014 [P] Update `src/app/api/roles/route.ts` — scope GET and POST by `userId`
- [x] T015 [P] Update `src/app/api/roles/[id]/route.ts` — scope PATCH and DELETE by `userId`
- [x] T016 [P] Update `src/app/api/goals/route.ts` — scope GET and POST by `userId`
- [x] T017 [P] Update `src/app/api/goals/[id]/route.ts` — scope GET, PATCH, DELETE by `userId`
- [x] T018 [P] Update `src/app/api/goals/[id]/progress/route.ts` — scope by `userId`
- [x] T019 [P] Update `src/app/api/goals/[id]/session-patterns/route.ts` — scope by `userId`
- [x] T020 [P] Update `src/app/api/goal-tallies/route.ts` — scope by `userId`
- [x] T021 [P] Update `src/app/api/goal-tallies/[id]/route.ts` — scope by `userId`
- [x] T022 [P] Update `src/app/api/activities/route.ts` — scope GET and POST by `userId`
- [x] T023 [P] Update `src/app/api/activities/[id]/route.ts` — scope PATCH and DELETE by `userId`
- [x] T024 [P] Update `src/app/api/activities/summary/route.ts` — scope by `userId`
- [x] T025 [P] Update `src/app/api/recurring-activities/route.ts` — scope by `userId`
- [x] T026 [P] Update `src/app/api/recurring-activities/[id]/route.ts` — scope by `userId`
- [x] T027 [P] Update `src/app/api/scheduler-settings/route.ts` — scope by `userId`
- [x] T028 [P] Update `src/app/api/scheduler-blackout-dates/route.ts` — scope by `userId`
- [x] T029 [P] Update `src/app/api/scheduler-blackout-dates/[id]/route.ts` — scope by `userId`
- [x] T030 [P] Update `src/app/api/schedule/generate/route.ts` — scope by `userId`
- [x] T031 [P] Update `src/app/api/schedule/apply/route.ts` — scope by `userId`
- [x] T032 [P] Update `src/app/api/schedule/reset/route.ts` — scope by `userId`
- [x] T033 [P] Update `src/app/api/activity-types/route.ts` — scope by `userId`
- [x] T034 [P] Update `src/app/api/activity-types/[id]/route.ts` — scope by `userId`
- [x] T035 [P] Update `src/app/api/activity-logs/route.ts` — scope by `userId`
- [x] T036 [P] Update `src/app/api/activity-logs/[id]/route.ts` — scope by `userId`
- [x] T037 [P] Update `src/app/api/body-metrics/route.ts` — scope by `userId`
- [x] T038 [P] Update `src/app/api/body-metrics/[id]/route.ts` — scope by `userId`
- [x] T039 [P] Update `src/app/api/budget-settings/route.ts` — scope by `userId`
- [x] T040 [P] Update `src/app/api/budget/summary/route.ts` — scope by `userId`
- [x] T041 [P] Update `src/app/api/spending/route.ts` — scope by `userId`
- [x] T042 [P] Update `src/app/api/spending/[id]/route.ts` — scope by `userId`
- [x] T043 [P] Update `src/app/api/spending-categories/route.ts` — scope by `userId`
- [x] T044 [P] Update `src/app/api/spending-categories/[id]/route.ts` — scope by `userId`
- [x] T045 [P] Update `src/app/api/fixed-costs/route.ts` — scope by `userId`
- [x] T046 [P] Update `src/app/api/fixed-costs/[id]/route.ts` — scope by `userId`
- [x] T047 [P] Update `src/app/api/income/route.ts` — scope by `userId`
- [x] T048 [P] Update `src/app/api/income/[id]/route.ts` — scope by `userId`
- [x] T049 [P] Update `src/app/api/planned-expenses/route.ts` — scope by `userId`
- [x] T050 [P] Update `src/app/api/planned-expenses/[id]/route.ts` — scope by `userId`
- [x] T051 [P] Update `src/app/api/training-plans/route.ts` — scope by `userId`
- [x] T052 [P] Update `src/app/api/training-plans/[id]/route.ts` — scope by `userId`
- [x] T053 [P] Update `src/app/api/training-plans/assess-level/route.ts` — add auth check (no data query, but must be authenticated)
- [x] T054 [P] Update `src/app/api/training-plans/refresh-descriptions/route.ts` — scope by `userId`
- [x] T055 [P] Update `src/app/api/training-phases/[id]/transition/route.ts` — scope by `userId` (via training plan)
- [x] T056 [P] Update `src/app/api/weekly-plans/route.ts` — scope by `userId` (table confirmed present; route may still exist for internal scheduler use)
- [x] T057 [P] Keep `src/app/api/health/route.ts` **public** (no auth check). It triggers the daily auto-backup and may be pinged by Railway for uptime monitoring. It exposes no user data, so requiring auth would break external monitoring without any security benefit. Decision: explicitly public.
- [x] T058 [P] Update `src/app/api/goals/[id]/children/route.ts` — scope by `userId`
- [x] T059 [P] Update `src/app/api/goal-session-patterns/[id]/route.ts` — scope by `userId`

**Checkpoint**: Log in as your user. All sections show your data (backfilled). Create a second test user (via the seed script from T010 — run it again with different credentials). Log in as that user. Confirm every section is empty (new user, no data). ✓

---

## Phase 4: Per-User Default Seeding

**Purpose**: When a new user logs in for the first time, seed their default roles, activity types, spending categories, and scheduler settings. Currently this happens once at app startup — we need it to happen per user on first login.

- [x] T060 Create `src/lib/seed-user-defaults.ts` — a function `seedUserDefaults(userId: string)` that:
  - Checks if the user already has roles (if yes, returns immediately — idempotent)
  - If no roles exist for this user, inserts default roles from `src/lib/defaults.ts` with `userId`
  - Similarly seeds default activity types, spending categories, and a default scheduler settings row for this user
- [x] T061 Call `seedUserDefaults(userId)` inside the NextAuth `signIn` callback in `src/lib/auth.ts` — runs on every login but is idempotent so safe to repeat.
- [x] T062 Remove or guard any existing global seeding logic that runs without a `userId` (check `src/app/api/*/route.ts` files that seed defaults on first GET — they must now check by userId).

**Checkpoint**: Create a new test user. Log in as them. Navigate to Roles — you see the 6 default roles. Navigate to Activities — you see the default activity types. Navigate to Budget → Categories — you see default spending categories. ✓

---

## Phase 5: Admin User Management

**Purpose**: A simple admin UI at `/admin/users` for creating and deactivating accounts.

- [x] T063 Create `src/app/admin/users/page.tsx` — admin-only page showing all users (username, role, active status, created date). Includes a "Create User" form and a "Deactivate" toggle per user.
- [x] T064 Create `src/app/api/admin/users/route.ts` — GET (list users) and POST (create user with hashed password). Checks `session.user.role === "admin"` — returns 403 if not.
- [x] T065 Create `src/app/api/admin/users/[id]/route.ts` — PATCH to toggle `isActive`. Admin-only. Prevent deactivating the last admin account.
- [x] T066 Add an "Admin" link to `src/components/layout/app-sidebar.tsx` that only renders when `session.user.role === "admin"`.

**Checkpoint**: Log in as admin. Visit `/admin/users`. Create a friend's account. Log in as that friend in a different browser — they see the full app with their own defaults. Deactivate the friend's account. They can no longer log in. ✓

---

## Phase 6: Production Deployment

**Purpose**: Deploy the app to Railway so friends can access it via a real URL.

- [x] T067 Add required environment variables to `.env.example`:
  - `AUTH_SECRET` (random 32+ char string — `openssl rand -base64 32`)
  - `DB_PATH` (path to SQLite file, e.g. `/data/life-app.db`)
  - `NEXTAUTH_URL` (the public URL of the deployed app)
  - `AUTH_TRUST_HOST=true` (required for NextAuth v5 in production behind a proxy)
  - `ADMIN_USERNAME` / `ADMIN_PASSWORD` (used by `apply-schema.js` to bootstrap first admin)
- [x] T068 Update `Dockerfile`: store SQLite DB at `/data/life-app.db`, run `apply-schema.js` before `server.js` on every boot. Copy `bcryptjs`, `better-sqlite3`, and `apply-schema.js` into the runner stage.
- [x] T069 Sign up for Railway (railway.app). Create a new project. Connect the GitHub repo. Set root directory to `Life App/` in Railway service settings.
- [x] T070 Set environment variables in the Railway dashboard: `AUTH_SECRET`, `DB_PATH=/data/life-app.db`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST=true`, `PORT=3000`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
- [x] T071 Add a Railway volume mount at `/data` for SQLite persistence.
- [x] T072 Deploy and verify: visit the public URL → see login page → log in → full app works → log out.
- [x] T073 Restart the Railway container and confirm data is not lost (SQLite volume persistence test).

**Notes from deployment**:
- Railway service root directory must be set to `Life App/` (not the repo root) for Dockerfile detection to work.
- `AUTH_TRUST_HOST=true` is required — without it, NextAuth v5 throws `UntrustedHost` in production.
- `PORT=3000` must be set explicitly — Railway's dynamic port assignment conflicted with the app default.
- Admin is bootstrapped via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars in `apply-schema.js` (creates admin only if no users exist).

**Checkpoint**: Share the URL with one friend. They log in with their account. You restart the deployment. Their data is still there. ✓

**Production URL**: `https://life-app-production-938a.up.railway.app`

---

## Phase 7: Polish & Security Hardening

**Purpose**: Small but important finishing touches before broadly sharing with friends.

- [x] T074 Add rate limiting to the login endpoint (`/api/auth/callback/credentials`) — max 5 failed attempts per IP per minute. Use a simple in-memory counter.
  > **Known limitation**: in-memory counters reset on container restart (e.g. on every Railway deploy). For a small private friend group this is an acceptable trade-off — a restart is not a real attack surface. A persistent counter (Redis, etc.) is overkill here. This is a conscious decision, not an oversight.
- [x] T075 Audit all API routes: ensure every route in Phase 3 returns 401 (not 500) when the session is missing.
- [x] T076 Add a user-facing "Change Password" form in Settings (`src/app/settings/page.tsx` or a sub-page). Calls a new `PATCH /api/user/password` route.
- [x] T077 Update `AGENT-ONBOARDING.md` to reflect the new multi-user architecture, auth flow, and deployment setup.
- [x] T078 Update `specs/master/data-model.md` to document the `users` table and the `user_id` column on all tables.
- [x] T079 Fix container security: run `chown -R nextjs:nodejs /data` as root at startup, then drop to unprivileged `nextjs` user (UID 1001) via `su-exec` before running `apply-schema.js` and `server.js`. Resolves Railway volume permission issue without running the app as root permanently.
- [x] T080 Remove 5 committed error log files from git history (`git rm --cached "Error logs/"`) and add `Error logs/` to `.gitignore` so runtime debug dumps are never committed again.

**Checkpoint**: Final review — every friend has their own account, their own data, HTTPS works, passwords can be changed, and the admin can manage accounts. ✓

---

## Dependencies & Execution Order

| Phase | Depends on | Can parallelize within phase? |
|-------|-----------|-------------------------------|
| Phase 1 (Auth) | Nothing | No — sequential setup |
| Phase 2 (Schema) | Phase 1 complete | Mostly no — one migration |
| Phase 3 (API routes) | Phase 2 complete | **Yes — all T014–T059 in parallel** |
| Phase 4 (Seeding) | Phase 3 complete | No — sequential |
| Phase 5 (Admin UI) | Phase 4 complete | No — sequential |
| Phase 6 (Deployment) | Phase 5 complete | No — sequential |
| Phase 7 (Polish) | Phase 6 complete | Yes — T074–T080 in parallel |

---

## Important Notes

- **Do Phase 1 before anything else.** Without auth, you cannot test isolation.
- **The backfill script (T013) is critical.** Without it, your existing data disappears after the migration.
- **Phase 3 is the biggest chunk.** There are ~45 routes. Work through them systematically. They all follow the same pattern — it's repetitive but not hard.
- **Test with two browser profiles.** Use Chrome's "person" feature or separate browsers to simulate two users simultaneously.
- **Never store passwords in plain text.** bcryptjs handles this — just don't log or return `passwordHash` anywhere.
