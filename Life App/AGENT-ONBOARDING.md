# Life App -- Agent Onboarding Document

> **Purpose**: Get a new AI agent up to speed on the Life App project quickly.
> **Last updated**: 2026-08-17 (Life App 2.0 merged to production)

---

## Step 1: Read These Files First

Before doing anything, read these documents in order:

1. **Constitution** -- `Life App/.specify/memory/constitution.md` (governing principles)
2. **Roadmap** -- `Life App/ROADMAP.md` (feature status, tech stack, what's built — **Life App 2.0 is complete on `master`**)
3. **System Overview** -- `Life App/specs/master/system-overview.md` (page → component → route → table map; cross-feature interactions; architectural patterns)
4. **Feature Specs Registry** -- `Life App/specs/master/feature-specs.md` (locked decisions and technical footprint for every feature in one file)
5. **Data Model** -- `Life App/specs/master/data-model.md` (database tables and relationships — includes 2.0 tables: `sleep_logs`, `daily_metrics`, `garmin_connections`, `email_preferences`)
6. **API Contracts** -- `Life App/specs/master/contracts/api-routes.md` (all REST endpoints — includes Garmin, dashboard, email digest, budget forecast)
7. **Tasks Log** -- `Life App/specs/master/tasks.md` (completed work and architectural iterations)
8. **Life App 2.0 Spec** -- `Life App/.specify/specs/life-app-2.0/spec.md` (dashboard, Garmin, habits redesign, session card, budget forecast, email digest — **merged PRs #94–#108**)
9. **Deployment Guide** -- `Life App/DEPLOYMENT.md` (Railway setup, env vars, Gmail cron, Docker/Garmin notes, troubleshooting)

Then familiarize yourself with the codebase structure:

- `src/db/schema.ts` -- Drizzle ORM schema (all tables)
- `src/types/index.ts` -- TypeScript interfaces
- `src/components/layout/app-sidebar.tsx` -- Navigation structure (Execution / Planning / Life Areas)
- `src/lib/garmin-client.ts` -- **Single swap point** for unofficial Garmin API (library issues stay here)
- `src/lib/garmin-sync.ts` -- Pure sync/dedup/auto-complete logic (tested)
- `src/components/dashboard/dashboard-view.tsx` -- Homepage trophy case + silent Garmin auto-sync
- `src/app/settings/layout.tsx` -- Settings tab nav (Roles, Activity Types, Scheduler, Garmin, Email digest, Password)
- `scripts/patch-garmin.cjs` -- Postinstall patch for `garmin-connect-client` (patches `dist/types.js` for unknown activity type keys like `tennis_v2`)

---

## Step 2: Understand the Operating Principles

These are the rules for working on this project. They come from the constitution and from the user's preferences established across multiple sessions.

### Agent Behavior

- **You are a professor.** You are teaching the user how to build software. Be patient, but to the point.
- **Don't be a yes-man.** The user is not a developer. Don't agree with everything they say -- push back with intelligent reasoning when they're wrong. Be a friend who keeps it real.
- **Explain before acting.** Don't do anything before explaining why and getting approval. The user approves or rejects.
- **No hallucinations.** When documenting or summarizing, verify against source material. This has been emphasized repeatedly.
- **Iterate in small steps.** Don't write giant prompts or make sweeping changes. Chop things up.

### Development Workflow

- **Spec-driven.** Every feature follows: Specify → Clarify → Plan → Tasks → Implement.
- **One feature at a time.** No parallel feature development.
- **Scope is additive.** Don't rewrite earlier features when adding new ones.
- **Constitution wins.** If a feature request conflicts with a principle, the principle wins unless the constitution is formally amended.

### Technical Constraints

- **Multi-user, invite-only.** The app is deployed on Railway with NextAuth.js v5 (JWT sessions, Credentials provider). The admin creates accounts at `/admin/users`. No public signup.
- **Per-user data isolation.** Every table has a `user_id` column. All API routes scope queries with `WHERE user_id = session.user.id`. Unauthenticated requests return 401.
- **Desktop only.** No mobile app.
- **The user has other projects running.** Do not touch ports 8000 or 5173, or modify anything outside the `Life App/` folder.
- **Production migrations via `apply-schema.js` only.** Never use `npx drizzle-kit migrate` in production. Every schema change must be reflected in `apply-schema.js` using `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS`. Test changes against a fresh DB before deploying.
- **Garmin sync requires Linux.** `garmin-connect-client` depends on native addons that do not install on Windows. Use `docker compose up` for local Garmin testing, or test in production/Railway.
- **Garmin library issues stay in one file.** Do not spread workarounds for `garmin-connect-client` across the codebase — contain them in `src/lib/garmin-client.ts` and `scripts/patch-garmin.cjs`. See `.specify/specs/life-app-2.0/HANDOFF.md`.
- **Container runs as `nextjs` (UID 1001) at app runtime.** The Dockerfile starts as root to `chown` the Railway volume, then drops to the unprivileged `nextjs` user via `gosu` before running any app code. Base image is `node:20-slim` (Debian/glibc — required for native addons).

---

## Step 3: Know the Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.x (App Router, Turbopack) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS v4 (OKLCH theme variables) |
| Components | shadcn/ui + Lucide icons |
| Typography | Plus Jakarta Sans (body), Fraunces (display), JetBrains Mono (code) |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| Auth | NextAuth.js v5 (Credentials provider, JWT sessions) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/core |
| Date utils | date-fns, Luxon (Garmin sleep dates) |
| Email | Nodemailer + Gmail SMTP (morning digest) |
| Garmin | `garmin-connect-client` (unofficial Connect API, optional dep) |
| Theming | next-themes (light/dark) |
| Testing | Vitest + React Testing Library |

### Architecture Patterns

- **Thin pages.** `src/app/*/page.tsx` files delegate to feature components under `src/components/`.
- **Local state.** `useState` + `useEffect` + `useCallback`. No global store (no Redux/Zustand).
- **REST APIs.** All under `src/app/api/`. Components fetch with `Promise.all` for parallel loading.
- **Optimistic UI.** Toggles update local state immediately, then sync with the API.
- **Loading.** Skeleton layouts that mirror the final layout.
- **Empty states.** Cards with icon, message, and CTA when no data exists.
- **Forms.** Controlled inputs, validation in submit handlers. No form library in most components (some use react-hook-form).
- **Backup.** Daily auto-backup of SQLite DB (max 7 kept), triggered via `/api/health`.

---

## Step 4: Know What's Built

**Core features:**

| Feature | Status |
|---------|--------|
| Calendar Management (7 Habits) | Built |
| Activities Tracking (formerly Fitness) | Built |
| Budget Management | Built |
| Goals V2 (Hierarchy, Dashboard, Tallies) | Built |
| Scheduler Rules System | Built |
| Climbing Training Periodization | Built |
| Tennis Training Periodization | Built |
| Running Training Periodization | Built |
| Habit Tracking | Built |
| Habit Tracking V2 (habit loop, cue types, keystone, nudge, editorial) | Built |
| Body Metrics Guidance (interpretation, About You, edit/delete log) | Built |
| Planning / Execution Redesign (This Week view, Execution/Planning nav, phase-aware scheduling, session warning) | Built |
| First-Time Onboarding Wizard | Removed |

**Infrastructure & overhauls:**

| Change | Status |
|--------|--------|
| Dockerization & Deployment | Built |
| v2 Overhaul (simplification) | Complete |
| UI Refactoring V1 (nav, empty states, dark mode, polish) | Complete |
| UI Refinements March (trimming, DnD, training display) | Complete |
| UI Design Overhaul (typography, colors, motion, card redesign) | Complete |
| Friend Release (multi-user auth, per-user isolation, admin UI, Railway) | Complete |
| Container security hardening (gosu privilege drop, Debian slim base) | Complete |
| **Life App 2.0** — Dashboard homepage, Garmin auto-sync, habits year heatmap, Today's Session card, budget forecast tab, morning email digest, settings tab refactor | Complete (merged to `master` 2026-08-13, PRs #94–#108; Garmin `tennis_v2` fix PR #109) |

**Life App 2.0 highlights** (all live in production):

| Area | What shipped |
|------|--------------|
| Dashboard (`/dashboard`) | Default landing page; sleep, calories, activities, habit consistency; silent Garmin sync if stale (> 30 min) |
| Garmin | Per-user connect/sync/disconnect; encrypted session tokens; activity dedup; sleep/daily metrics upsert; auto-completes matching training sessions |
| Habits | Year heatmap + "X/30 days" consistency metric (no guilt framing); streak is secondary |
| Goals | Today's Session card(s) on Goals page — phase, focus, mark done |
| Budget | Forecast tab — 12-month cash flow table, savings trajectory chart, scenario panel |
| Email digest | Opt-in daily/weekly morning email; sync-then-send cron; library concept section; per-topic exclusions |
| Settings | Tabbed sub-pages: Roles, Activity Types, Scheduler, Garmin, Email digest, Password |

See `ROADMAP.md` and `progress.md` for full details and deployment lessons learned.

---

## Step 5: Production Deployment

The app is live at `https://life-app-production-938a.up.railway.app`.

### How Deployment Works

Pushing to `master` on GitHub triggers an automatic Railway redeploy. No manual steps needed.

```bash
git push origin master
# Railway detects the push, rebuilds the Docker image, and redeploys
```

### Key Deployment Facts

- **Platform**: Railway — connects directly to the GitHub repo and builds from `Life App/Dockerfile`.
- **Database**: SQLite at `/data/life-app.db` on a persistent Railway volume. Data survives redeploys and restarts.
- **Schema migrations**: `apply-schema.js` runs automatically at container startup (before the Next.js server starts). It is idempotent — safe to run repeatedly.
- **Admin bootstrap**: On a fresh database, `apply-schema.js` creates the admin account from `ADMIN_USERNAME` + `ADMIN_PASSWORD` env vars. Only fires once (when the `users` table is empty).
- **Container security**: Container starts as root to fix volume permissions (`chown /data`), then drops to `nextjs` (UID 1001) via `gosu` before running any app code.
- **Required env vars (auth)**: `AUTH_SECRET`, `DB_PATH=/data/life-app.db`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST=true`, `PORT=3000`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (bootstrap only).
- **Required env vars (Life App 2.0)**: `ENCRYPTION_KEY` (Garmin token encryption), `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CRON_SECRET` (morning digest cron endpoint).
- **Morning digest cron**: Separate Railway cron service hits `POST /api/cron/morning-digest` at 07:00 Europe/Brussels. See `DEPLOYMENT.md` for DST notes.

For the full deployment reference (first-deploy steps, Docker on Windows, troubleshooting), see **`DEPLOYMENT.md`**.

---

## Step 6: Starting the App Locally

```bash
cd "Life App"
npm run dev
```

The app runs at **http://localhost:3000**. It redirects `/` to `/dashboard`.

**Garmin on Windows**: `npm run dev` works for most features, but Garmin connect/sync requires Docker (native addon). For full 2.0 testing:

```bash
docker compose up --build
```

Other commands:
- `npm run build` -- production build
- `npm run test` -- run Vitest tests (watch)
- `npm run test:run` -- run tests once (no watch)

---

## The Original Prompt

This is the prompt that started the project. It captures the user's full vision and sets the tone for all agent interactions:

> I want to start developing a personal development, or life mgmt app based on the material I have in books and podcasts. This as a side project to learn how to build apps.
> I want to create 1 for myself locally. Please hold these prompts into account moving forward:
>
> - I'm not a developer, so I don't need you to agree with everything I say, I'm not smarter than you
> - You are a professor, you are teaching me how to do it and why to do it that way. You are patient, but to the point
> - You don't do anything, before asking me to confirm it is ok, you explain why we should do it and then I approve/reject
> - Always check https://github.com/ChatPRD/lennys-podcast-transcripts?tab=readme-ov-file for best practices, this can be your course material, they know their stuff
> - I don't know where to start, you really need to hold my hand and guide me through the whole process
> - I want to use spec driven approach as a skill https://github.com/github/spec-kit
> - I want to first figure out the specs, the product scope and the roadmap before we do any sort of development. I want you to help me plan this and we should start with what the app should actually do.
> - I don't know how to do UI things, but I assume you can find repos with nice front end features or something?
>
> If you need to create documentation, please create a new folder called Life App. My main thought for the app right now are:
>
> - **Budget management**: I need to be able to set my savings goal and monthly costs. When I update my costs on a daily basis, all metrics are adjusted and I see what spending budget I have left for the rest of the month. It should have graphs and metrics both monthly and yearly.
> - **Calendar mgmt**: Based on the principles from 7 Habits of Highly Effective People I want to manage my calendar based on goals and principles I set for myself. These can be athletic, career, personal, anything that makes sense to add.
> - I want to be able to add metrics from daily workouts which would then update my personal metrics like VO2 max and training consistency. For example, I don't use my tracker watch during tennis games, but I should be able to add tennis matches which would then hold into consideration an average steps and calories amount. This average (1 for a singles game and 1 for doubles game) I should be able to set myself. I should be able to do this for all sports.
> - I want to be able to set training goals for myself which are then reflected in my calendar with explanations on why we do what.
> - The calendar can be in-app, doesn't need to integrate.
> - Strava integration might be nice to have in the future.
> - I should be able to talk to an agent explaining what I want the app to do for me.
> - There should be a self evaluation section where people can upload things they wrote about themselves so the AI can learn about the user.
> - There should be a suggestion section where the agent suggests books to read or things to look into based on the conversations with the user. The user should be notified when this section is updated.
> - Based on recent activity, a general overview should update giving visual feedback on athletic, professional and personal info (budget as well). You can add weight, if overweight, this should show. If the budget is low, it should show, and so on... It should be a human shape that is updated with colors in relevant places. It should also show streak success on relevant metrics the user set themselves.
> - There should not be any authentication for now, I'm just running it locally for myself.

---

## Key Prompts Used During Development

These prompts shaped important architectural decisions and are useful context for understanding why things are built the way they are.

### On Goals Architecture

> Having weekly goals makes it difficult to figure out to be honest. The goals should be quarterly or even yearly. You can't reset weekly goals every week, you should tweak the yearly/monthly goals, work topdown so the weeks work up to a main goal a couple of months from now.

This led to the **Goals Architecture Refactor**: standalone goals with flexible target dates, a dedicated Goals page, and a "weekly focus" mechanism where users select which existing goals to work on each week.

### On Multi-Role Goals and Dynamic Quadrants

> - It should be possible to add multiple roles per goal
> - The quarter/urgency dropdown is not needed, it doesn't make much sense. We should do the urgency evaluation based on target date

This led to multi-role support via the `goal_roles` junction table and dynamic quadrant derivation from target date (Q1 if overdue or within 7 days, Q2 otherwise).

### On Agent Personality

> Thanks man, I need this, I know you're just an AI, but pretending you're not is so much more fun! Also, keep being a friend, keep it real, don't always agree or try to be my friend. I need someone who pushes back (based on intelligent reasoning, not for the sake of it).

### On Self-Education and Onboarding

> Ok, I am going to use you to continue the development. Please educate yourself on anything life app related and let me know if you have any questions.

Use this as a starting prompt when onboarding: read all spec files, the roadmap, the schema, the constitution, and key components before starting work.

---

## Vibe Coding Guide

The user follows principles from the **Vibe Coder's Playbook** (see `Vibe-Coding-Guide-Build-Apps-From-Scratch.md` in the project root). Key rules that apply to this project:

| # | Rule | Source |
|---|------|--------|
| 1 | Don't build until you've talked to people who *switched* solutions | Bob Moesta |
| 2 | Cut your feature list in half, then in half again | Eric Ries |
| 3 | Set a time budget (appetite), then shape the idea to fit | Ryan Singer |
| 4 | Prompt in small steps -- don't write one giant instruction | Michael Truell |
| 5 | Be specific about what's wrong, not just "it doesn't work" | Anton Osika |
| 6 | Deliver value in the first 3 seconds | Nikita Bier |
| 7 | Ship to learn, not to be right | Eric Ries |
| 8 | Keep the burn rate low -- maximize shots on goal | Eric Simons |
| 9 | Underdo the competition -- simplicity wins | Jason Fried |
| 10 | Think like an architect, not a bricklayer | Scott Wu |

### How These Apply to Agent Work

- **Rule 3 (Shape Up)**: The user sets an appetite for each feature. Shape the work to fit the time, don't extend the time.
- **Rule 4 (Small Steps)**: Iterate in small chunks. One feature at a time, one task at a time. Verify before moving on.
- **Rule 5 (Be Specific)**: When reporting issues, describe exactly what's expected and what's happening.
- **Rule 7 (Ship to Learn)**: Don't over-polish. Get it working, get feedback, iterate.
- **Rule 9 (Underdo)**: Don't overbuild. The app is for one person. Simplicity over cleverness.

The full guide with detailed explanations, quotes from founders (Cursor, Lovable, Bolt, Devin), and recommended watching is in `Vibe-Coding-Guide-Build-Apps-From-Scratch.md`.

---

## Quick-Start Onboarding Prompt

Copy-paste this to onboard a new agent session:

```
I am going to use you to continue development on the Life App. Please read
these files to get up to speed:

1. Life App/AGENT-ONBOARDING.md (this document -- read first)
2. Life App/ROADMAP.md (Life App 2.0 section at bottom)
3. Life App/progress.md (deployment lessons from 2.0 ship)
4. Life App/.specify/memory/constitution.md
5. Life App/.specify/specs/life-app-2.0/spec.md
6. Life App/specs/master/system-overview.md
7. Life App/specs/master/feature-specs.md
8. Life App/specs/master/data-model.md
9. Life App/specs/master/contracts/api-routes.md
10. Life App/specs/master/tasks.md
11. Life App/DEPLOYMENT.md

Then explore: schema, types, dashboard + Garmin + settings components, and API routes under `src/app/api/garmin/`, `src/app/api/cron/`, `src/app/api/dashboard/`.
Let me know when you're ready and if you have any questions.
```
