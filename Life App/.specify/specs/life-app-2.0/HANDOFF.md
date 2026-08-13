# Life App 2.0 — Developer Handoff Note

> **For**: The agent implementing Life App 2.0
> **From**: Planning session, 2026-08-10
> **Mode**: LOCAL ONLY. Wim verifies everything at http://localhost:3000 before anything is released to a feature branch.

---

## What You're Building

Life App 2.0 — a redesign that turns the app from a passive logger into a companion. New Garmin auto-sync, a dashboard homepage, habits heatmap, Today's Session card, quarterly budget UI, morning email digest. Everything is **additive** on the existing 1.0 codebase. Nothing is removed or rewritten.

All decisions are already made. Do not re-litigate scope or architecture — if something seems wrong or won't work, stop and ask Wim instead of improvising.

## Read These First (in order)

1. `Life App/AGENTS.md` — project rules, verification, definition of done
2. `scope.md` (this folder) — every decision + rationale, including the 2026-08-10 review amendments
3. `spec.md` (this folder) — user stories and acceptance criteria
4. `architecture.md` (this folder) — schema, routes, sync flow, exact technical delta
5. `plan.md` (this folder) — technical context, constitution gates, source tree
6. `tasks.md` (this folder) — your work list: 38 tasks, 9 phases, in order

## Ground Rules (non-negotiable)

1. **LOCAL ONLY — do not push anything.** Work on a local branch: `git checkout -b life-app-2.0`. Commit locally as you complete tasks. **Never push** — not this branch, and absolutely never `master` (pushing `master` auto-deploys to production via Railway). The branch gets pushed only after Wim has verified locally and explicitly says so.
2. **The local dev server is the verification surface.** `cd "Life App" && npm run dev` → http://localhost:3000. Check the terminals folder first — it may already be running.
3. **Local database only.** The dev SQLite DB is local; production data is untouched. Schema changes go into BOTH `src/db/schema.ts` and `apply-schema.js` (idempotent `CREATE TABLE IF NOT EXISTS` / column guards). Test `apply-schema.js` twice against a scratch DB (task T005).
4. **Stay in your lane.** Only touch files inside `Life App/`. Never touch ports 8000 or 5173. Port 3000 is ours.
5. **Every new API route**: `auth()` from `@/lib/auth`, scope with `WHERE user_id = session.user.id`, 401 without session. No exceptions (the cron digest endpoint uses `CRON_SECRET` instead — see architecture.md).
6. **Work task by task, in order.** Small verifiable chunks. Checkpoint after each phase in `tasks.md`. Mark tasks done with `[x]` as you go.
7. **Explain before acting** on anything not already covered by the task list, and pause at each phase checkpoint so Wim can verify in the browser before you continue.

## Local Environment Setup

Add to `Life App/.env.local` (create values, don't invent formats):

| Var | Local value |
|---|---|
| `ENCRYPTION_KEY` | Generate: 32 random bytes, base64 (`openssl rand -base64 32` or Node crypto) |
| `CRON_SECRET` | Any random string |
| `GMAIL_APP_PASSWORD` / `GMAIL_FROM_ADDRESS` | Leave placeholder until Phase 8 (US6) — Wim will provide when email work starts |

Garmin testing (Phase 3): the connect flow needs real credentials. Build it, then **hand the browser to Wim to enter his own Garmin credentials** at the settings page — do not ask for credentials in chat, do not hardcode them anywhere.

## Build Order & Verification Gates

Follow `tasks.md` phases exactly. The rhythm:

1. **Phase 1–2** (setup + schema) → gate: `npm run build` passes, `apply-schema.js` idempotent on scratch DB
2. **Phase 3** (US1 Garmin) → gate: Wim connects his Garmin at localhost:3000/settings, syncs, sees real rows; second sync = zero duplicates
3. **Phase 4** (US2 Dashboard) → gate: **MVP** — login lands on `/dashboard` with real synced data; without a connection, calm "Connect Garmin" state. Wim reviews look & feel here (design system: Fraunces, warm OKLCH, no guilt states) before you continue
4. **Phases 5–8** (habits heatmap, session card, budget, email) → one phase at a time, Wim verifies each in the browser
5. **Phase 9** (polish) → `npm run build` + `npm run test:run` green, master docs updated (T037–T038)

## Definition of Done (per AGENTS.md)

Build passes, relevant Vitest tests pass (pure logic only — the test files are named in tasks.md), no new linter errors, `progress.md` updated at end of every session with what changed + verification evidence + next task ID.

## If You Get Stuck

- Garmin library issues (`garmin-connect-client`): the wrapper `src/lib/garmin-client.ts` is the single swap point — contain problems there, report to Wim, don't spread workarounds through the codebase.
- Anything ambiguous: the decision is probably recorded in `scope.md`. If genuinely not covered — ask, don't assume.
