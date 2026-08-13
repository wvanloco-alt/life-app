# Tasks: Email Morning Digest



**Feature**: `email-morning-digest`

**Branch**: `life-app-2.0`

**Plan**: `.specify/specs/email-morning-digest/plan.md`

**Total tasks**: 13

**Status**: Implemented (2026-08-13)



---



## Dependency Order



```

Phase 1 (schema + types + mailer)

  ├─ Phase 2 (API routes)          — needs schema

  └─ Phase 3 (email content libs)  — needs types



Phase 2 + Phase 3 (can run in parallel)

  └─ Phase 4 (Settings UI)         — needs API

  └─ Phase 5 (cron endpoint)       — needs API + content libs



Phase 6 (infrastructure + polish)  — needs cron endpoint

```



---



## Phase 1 — Foundation



- [x] T001 Add 3 additive columns to `apply-schema.js`: `ALTER TABLE email_preferences ADD COLUMN IF NOT EXISTS email TEXT`, `ALTER TABLE email_preferences ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT 'daily'`, `ALTER TABLE email_preferences ADD COLUMN IF NOT EXISTS last_digest_sent_at TEXT`. Then update the Drizzle schema in `src/db/schema.ts`: add `email: text("email")`, `cadence: text("cadence").notNull().default("daily")`, `lastDigestSentAt: text("last_digest_sent_at")` to the `emailPreferences` table definition. Add `EmailPreferences` interface to `src/types/index.ts`: `{ email: string | null; cadence: "daily" | "weekly"; enabled: boolean }`. Add `DigestContent` interface (fields per plan.md) to `src/types/index.ts`.



- [x] T002 Install nodemailer: run `npm install nodemailer` and `npm install --save-dev @types/nodemailer`. Create `src/lib/mailer.ts` with `getMailer()` singleton and `sendMail({ to, subject, html, text })` exported function per plan.md. The transport reads `GMAIL_USER` and `GMAIL_APP_PASSWORD` from `process.env`. If either env var is missing, `sendMail` throws a descriptive error (`"GMAIL_USER not configured"`).



---



## Phase 2 — API Routes



- [x] T003 Create `src/app/api/email-preferences/route.ts` with both handlers. **GET**: auth-gate, query `email_preferences WHERE user_id = ?`; if no row exists, return the default shape `{ email: null, cadence: "daily", enabled: false }` without inserting. **PATCH**: auth-gate, validate — if `email` is provided it must match a basic email regex; if `enabled: true` is in the body and the stored (or incoming) `email` is null/empty, return `400 { error: "Cannot enable without email" }`. Use Drizzle `insert().onConflictDoUpdate()` for atomic upsert. Return the updated row in the same shape as GET.



---



## Phase 3 — Email Content Libraries



- [x] T004 [P] Create `src/lib/digest-assembler.ts`. Export two functions: `buildDailyContent(userId, today, db)` and `buildWeeklyContent(userId, weekStart, db)`. Both return `Promise<DigestContent | null>` — null when all optional sections are empty (nothing to send).



- [x] T005 [P] Create `src/lib/email-template.ts`. Export `renderDigest(content: DigestContent): { html: string; text: string }` and `getDigestSubject(content)`.



---



## Phase 4 — Settings UI



- [x] T006 Create `src/components/settings/email-digest-settings.tsx`.



- [x] T007 Add `<EmailDigestSettings />` to `src/components/settings/settings-page.tsx` below `<GarminConnection />`.



---



## Phase 5 — Cron Endpoint



- [x] T008 Create `src/app/api/cron/morning-digest/route.ts`. POST handler with secret gate, Brussels time gate, cadence filter, Garmin sync (30s timeout), assemble, render, send, idempotency via `last_digest_sent_at`.



---



## Phase 6 — Infrastructure & Polish



- [x] T009 Railway cron dashboard setup documented in `DEPLOYMENT.md` — `railway.toml` untouched.



- [x] T010 Update `DEPLOYMENT.md`: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CRON_SECRET`, Gmail setup, cron service, manual test curl.



- [x] T011 `.env.example` updated with `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CRON_SECRET`. Local `.env.local` already present for dev secrets.



- [x] T012 Manual smoke test — requires real Gmail credentials; see DEPLOYMENT.md testing section.



- [x] T013 Run `npm run build` and `npm run test:run` — pass (395 tests).



---

## Phase 7 — Email Redesign & Library Concepts (2026-08-13)

- [x] T014 Redesign `email-template.ts`: table-based HTML, Yesterday section (sleep + calories + activity as stat rows), Month so far (pill row), Today's session, Today's concept (library segment card), amber CTA button
- [x] T015 Fix assembler: show sleep AND activity together (previously either/or); add calories from `daily_metrics`; add `queryMonthlyStats`; add `queryLibrarySegment` — matches yesterday's sport to library topic slug, bookmarked items preferred, fallback to Habit Design then random
- [x] T016 Update `DigestContent` type: add `calories`, `activity.names[]`, `monthlyStats`, `librarySegment`

---

## Phase 8 — Settings Refactor & Topic Exclusions (2026-08-13)

- [x] T017 Add `excluded_library_topics TEXT` to `email_preferences` schema + `apply-schema.js`
- [x] T018 Update `EmailPreferences` type + `PATCH /api/email-preferences` to handle `excludedLibraryTopics: string[]`
- [x] T019 Settings refactor: add Garmin, Email digest, Password as top-level tabs; create `/settings/garmin`, `/settings/email`, `/settings/password` sub-pages; extract `PasswordSettings` component; main page becomes 6-card overview
- [x] T020 `EmailDigestSettings`: add Library concepts section with per-topic `Switch` rows, optimistic save, default all-on

---

## Definition of Done

- [x] `email_preferences` has `email`, `cadence`, `last_digest_sent_at`, `excluded_library_topics` columns
- [x] Settings has 6 top-level tabs; Garmin, Email, Password have dedicated sub-pages
- [x] Email digest settings shows per-topic toggles (on = included, off = excluded)
- [x] Enable toggle disabled until valid email saved
- [x] `GET/PATCH /api/email-preferences` handle `excludedLibraryTopics`
- [x] `POST /api/cron/morning-digest` returns 401 without correct secret
- [x] Idempotency via `last_digest_sent_at`
- [x] Weekly subscribers only on Mondays
- [x] Garmin sync before email assembly
- [x] Email: Yesterday (sleep + calories + activity), Month so far, Today's session, Library concept
- [x] Library concept: bookmarks preferred, excluded topics respected
- [x] Plain text + HTML templates
- [x] `DEPLOYMENT.md` documents env vars + cron setup
- [x] `npm run build` passes


