# Implementation Plan: Life App 2.0

**Branch**: `life-app-2.0` (from `master`) | **Date**: 2026-08-10 | **Spec**: `spec.md` (this folder)
**Companion docs**: `scope.md` (decisions + rationale), `architecture.md` (technical delta), `tasks.md` (task breakdown)

## Summary

Turn the app from a passive logger into a companion: a `/dashboard` trophy-case homepage fed by per-user Garmin auto-sync (activities, sleep, calories), a habits year-heatmap with positive framing, a "Today's Session" training card, a quarterly-planning budget UI, and a warm morning email digest. All changes are additive on top of the 1.0 codebase — no rewrites, no feature removals.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js 16.x (App Router, Turbopack)
**Primary Dependencies (new)**: `garmin-connect-client` (unofficial Garmin Connect API), `nodemailer` (Gmail SMTP). Everything else is the existing stack (Drizzle + better-sqlite3, NextAuth v5, shadcn/ui, Recharts).
**Storage**: SQLite at `/data/life-app.db` (Railway volume). 4 new tables + 1 new column, additive only, migrated via `apply-schema.js`.
**Testing**: Vitest — pure logic only (crypto, garmin mapping/sync, session derivation, budget scenarios, digest composition). No UI tests.
**Target Platform**: Desktop browser; deployed on Railway (Docker), plus one new one-shot cron service.
**Project Type**: Existing Next.js web app — single project, App Router.
**Performance Goals**: Dashboard renders key metrics in < 2s via a single aggregation endpoint (`GET /api/dashboard`).
**Constraints**: Per-user data isolation on every new route (`auth()` + `WHERE user_id`); positive framing everywhere (no guilt states); Garmin tokens encrypted at rest (AES-256-GCM, `ENCRYPTION_KEY`); production schema changes idempotent through `apply-schema.js` only.
**Scale/Scope**: Small invite-only friend group (~10 users). Unofficial Garmin API at personal volume.

No NEEDS CLARIFICATION items — all unknowns were resolved during scoping and the 2026-08-10 review (see `scope.md` amendments). Research decisions (library choice, MCP-is-dev-only finding, cron mechanics) are recorded in `scope.md` Decision 3/7 amendments rather than a separate research.md — one source of truth, no doc sprawl.

## Constitution Check

*Gate evaluated against constitution v1.1.0 — **PASS**, one point needs an explicit design guarantee:*

| Principle | Check |
|---|---|
| I. Effectiveness over busyness | Pass — dashboard rewards alignment/consistency, not volume; no achievement mechanics. |
| II. Private-first, invite-only multi-user | Pass — all 8 new routes auth-guarded and user-scoped; all 4 new tables carry `user_id`; per-user Garmin connections. Cron digest endpoint is machine-to-machine, protected by `CRON_SECRET`, and iterates users server-side without crossing data boundaries. |
| III. AI as advisor | N/A — no AI features in scope. |
| IV. Visual feedback over text | Pass — heatmap, metric cards, structured session card replace free text. |
| V. Simplicity and learnability | Pass with a note — `garmin-connect-client` is unofficial and could break; the risk is contained in one wrapper (`src/lib/garmin-client.ts`) so a library swap touches one file. |
| VI. Modular feature design | Pass — each story in `tasks.md` is independently buildable and testable; sync logic is a pure module. |
| Scope constraint: "External integrations are always optional enhancements, never core requirements" | **Pass, with a hard design guarantee**: the app must remain fully functional with zero Garmin connections. Manual activity logging stays; habits, goals, budget, training all work unchanged; the dashboard renders habit consistency and Today's Session with a calm "Connect Garmin" state for the device-fed cards (tasks T019/T021). Garmin removes friction — it is not load-bearing. If a future change makes the app unusable without Garmin, that requires a constitution amendment first. |

No violations → Complexity Tracking table not needed.

## Project Structure

### Documentation (this feature)

```text
Life App/.specify/specs/life-app-2.0/
├── scope.md          # Scoping decisions + review amendments (includes research decisions)
├── spec.md           # Feature specification
├── architecture.md   # Technical delta: schema, routes, flows (serves as data-model + contracts)
├── plan.md           # This file
└── tasks.md          # Task breakdown (38 tasks, 9 phases)
```

Data-model and API-contract deltas live in `architecture.md`; the master registry (`specs/master/data-model.md`, `specs/master/contracts/api-routes.md`) is updated at the end of implementation (task T037) — same pattern as previous features.

### Source Code (inside `Life App/`)

```text
src/
├── app/
│   ├── dashboard/page.tsx                      # NEW thin page (replaces /today as entry)
│   ├── page.tsx                                # CHANGED: / redirects to /dashboard
│   ├── settings/page.tsx                       # CHANGED: + Garmin card, + email toggle
│   └── api/
│       ├── dashboard/route.ts                  # NEW  GET aggregation
│       ├── garmin/connect/route.ts             # NEW  POST credentials → tokens
│       ├── garmin/sync/route.ts                # NEW  POST sync
│       ├── garmin/status/route.ts              # NEW  GET status / DELETE disconnect
│       ├── sleep-logs/route.ts                 # NEW  GET history
│       ├── daily-metrics/route.ts              # NEW  GET history
│       ├── email-preferences/route.ts          # NEW  GET/PATCH
│       ├── email/send-daily-digest/route.ts    # NEW  POST (CRON_SECRET)
│       └── habits/route.ts                     # CHANGED: ?since= param
├── components/
│   ├── dashboard/                              # NEW  view + metric cards + session card
│   ├── habits/habit-heatmap.tsx                # NEW  year heatmap (strip replaced)
│   ├── budget/                                 # CHANGED: planning-first restructure
│   ├── settings/garmin-connection.tsx          # NEW
│   └── layout/app-sidebar.tsx                  # CHANGED: Dashboard anchor
├── lib/
│   ├── crypto.ts                               # NEW  AES-256-GCM token encryption
│   ├── garmin-client.ts                        # NEW  library wrapper (single swap point)
│   ├── garmin-mapping.ts                       # NEW  activity type mapping
│   ├── garmin-sync.ts                          # NEW  pure sync/dedup/auto-complete logic
│   ├── todays-session.ts                       # NEW  pure session derivation
│   ├── budget-scenarios.ts                     # NEW  pure scenario math
│   ├── email-digest.ts                         # NEW  pure digest composer
│   ├── mailer.ts                               # NEW  Nodemailer transport
│   ├── habit-streaks.ts                        # CHANGED: + countDoneInWindow()
│   └── __tests__/                              # NEW tests for the pure modules above
├── db/schema.ts                                # CHANGED: 4 tables + 1 column
└── types/index.ts                              # CHANGED: new interfaces

apply-schema.js                                 # CHANGED: idempotent DDL for the above
```

**Structure Decision**: Existing single-project App Router layout, unchanged conventions — thin pages, feature components, pure logic in `src/lib/` with Vitest tests, REST under `src/app/api/`. All integration risk (unofficial Garmin API) is isolated behind `src/lib/garmin-client.ts`.

## Technical Approach (delta highlights)

Full detail in `architecture.md`; the load-bearing decisions:

1. **Garmin via unofficial Connect API** (`garmin-connect-client`), not the MCP server (dev-tool only, single-account, unreachable from Railway). Credentials entered once; only encrypted session tokens stored. ToS trade-off explicitly accepted 2026-08-10.
2. **Sync semantics**: activities dedup by `garmin_activity_id` (skip), sleep + daily metrics upsert on `(user_id, date)` (Garmin revises scores). Matching activity auto-completes today's scheduled training session (same day + sport).
3. **Sync-then-send digest**: the 07:00 cron endpoint syncs every connected user, then emails enabled users — guarantees fresh data with nobody awake. Trigger is a one-shot Railway cron service (curl + `CRON_SECRET`), since Railway cron runs containers, not HTTP calls.
4. **One aggregation endpoint** (`GET /api/dashboard`) instead of five parallel fetches — the most-loaded page gets one round trip.
5. **Positive framing enforced in data shape**: dashboard returns `doneLast30Days` per habit, not a streak — a streak resets to 0 on one miss, which is a guilt mechanic.

## Rollout

1. Implement per `tasks.md` phases; MVP = Setup + Foundational + US1 (Garmin) + US2 (Dashboard).
2. Deploy MVP to Railway from the `life-app-2.0` branch environment; live with it a few days before US3–US6.
3. Merge to `master` when acceptance criteria in `spec.md` pass; 1.0 stays deployable throughout.
