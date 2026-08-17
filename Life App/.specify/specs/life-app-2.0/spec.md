# Life App 2.0 — Feature Specification

> **Status**: Implemented (merged to `master` 2026-08-13)

---

## Why This Exists

The original Life App worked as a learning project but failed as a daily habit. The root cause: it was a **logging tool**, not a **life companion**. Every feature asked "did you do the thing?" — and when the answer was no, the app silently accumulated debt. Manual data entry killed the budget and activity tracking habits. Training schedules were noisy and unclear. The app had no pull — nothing made you want to open it.

Life App 2.0 answers the question: **if we knew then what we know now, what would we build?**

---

## Core Design Shift

| Life App 1.0 | Life App 2.0 |
|---|---|
| Log your life | **See your life** |
| Open it to enter data | **Open it to feel good** |
| Passive, waits for you | **Active, surfaces progress** |
| Guilt when you miss | **Celebration when you don't** |
| Manual entry everywhere | **Auto-sync where possible** |
| Everything equally important | **One home screen that matters** |

**The guiding principle**: The app is a trophy case, not a to-do list. It shows what you've built. Missing days are neutral — not penalized.

---

## Design Principles

1. **Positive framing always.** Show what was done, not what wasn't. No red streaks, no guilt states.
2. **The homepage is the reason you open the app.** Not to log — to see.
3. **Reduce friction ruthlessly.** If a feature requires daily manual entry to stay useful, the feature is broken.
4. **One clear thing at a time.** Training schedules show today's session, not the entire 12-week plan.
5. **Where life lives (Notion-style).** It should feel like a personal space, not a productivity SaaS.
6. **Calm over stimulation.** No achievement badges, no streak anxiety, no Duolingo guilt mechanics.

---

## Users

- **Wim** — primary user, the person the app was built for
- **Friends (invite-only)** — will join if Garmin integration exists; admin creates all accounts
- **No public signup** — admin-only account creation stays

---

## Feature Breakdown

### 1. Dashboard (New — Primary Entry Point)

The homepage. Everything else is secondary.

**At a glance:**
- Sleep score (last night, from Garmin)
- Calories burned (yesterday + rolling daily average for current week)
- Km run this week (from Garmin)
- Activities this week (count, from Garmin)
- Per-habit consistency: days done in the last 30 (not a streak — a streak resets to 0 on one miss, which is guilt)

**Design requirements:**
- Loads in under 2 seconds
- Positive framing: if no data yet today, show yesterday's or weekly average — never show "no data" as failure
- Warm, calm aesthetic — feels like checking in with yourself, not a dashboard audit
- Glanceable in 5 seconds — no scrolling required for the key metrics

**User stories:**
- As a user, I open the app and immediately see how my week is going without clicking anything
- As a user, I see how consistent each habit has been over the last 30 days, and a missed day never resets me to zero
- As a user, I see my physical activity this week without having to log anything manually

---

### 2. Garmin Integration (New — Core Infrastructure)

The single biggest change. Removes manual logging friction for all physical activity.

**How**: The unofficial Garmin Connect API via the `garmin-connect-client` Node library. Each user enters their Garmin credentials once; only session tokens are stored (encrypted), never the password. Trade-off accepted: this is against Garmin's ToS and could break if Garmin changes endpoints — the official API is not accessible to hobby projects.

**What syncs automatically:**
- Activities (runs, tennis matches, climbing sessions, cycling, etc.)
- Sleep score (nightly)
- Calories burned (daily)

**Sync behavior:**
- Triggered manually ("sync now" button), and automatically every morning by the email digest cron (sync-then-send)
- Deduplication by Garmin activity ID — syncing twice never creates duplicates; sleep records upsert per night
- Garmin activities map to the existing activities table
- A synced activity matching today's scheduled training session (same day, same sport) marks it done automatically

**User stories:**
- As a user, I finish a run and my Garmin uploads it — the app already knows, I don't need to do anything
- As a user, I can hit "sync" and my last 7 days of activity appear without manual entry
- As a user, my friends can connect their own Garmin accounts — their data is isolated to them

---

### 3. Budget (Redesigned — Quarterly Planning Tool)

Moves from daily expense tracker → **seasonal forecasting tool**. A few focused sessions per year, not a daily chore.

**What it does:**
- Set monthly fixed expenses (rent, subscriptions, etc.)
- Set yearly savings goal
- Model scenarios: "if I spend X on a holiday, what does my savings rate look like?"
- View progress against yearly savings goal based on actuals logged

**What it no longer does:**
- Daily expense entry (this killed the habit)
- Real-time budget remaining for the day

**Cadence:** Designed for 3-4 meaningful sessions per year — at month start, quarter end, before a big expense.

**User stories:**
- As a user, I open budget once a month to review where I stand against my savings goal
- As a user, I can model what a large purchase does to my annual savings rate
- As a user, I can set my fixed monthly costs once and not touch them for months

---

### 4. Training Schedules (Redesigned — Simplified)

All three sports stay (climbing, tennis, running). The periodization engine stays. The presentation changes entirely.

**What changes:**
- The primary view is **"Today's Session"** — one clear card telling you what to do
- The full multi-week plan is still accessible (secondary view, one tap away)
- Free text noise is removed; sessions are structured (type, duration, intensity, key focus)
- Completion is auto-detected via Garmin sync where possible

**What stays:**
- Periodization logic (phase-aware scheduling)
- Multi-sport support
- Training plan creation

**User stories:**
- As a user, I open the app before a session and immediately see what I'm doing today
- As a user, I don't need to read through a full training plan to know what today requires
- As a user, when I complete a session on Garmin, it auto-marks as done

---

### 5. Habits (Redesigned — Streak Archive)

Reframed from checklist → **wins record**.

**What changes:**
- Per-habit "X of last 30 days" count shown on dashboard (chosen over a current streak: a streak resets to 0 on one missed day — a guilt mechanic in disguise)
- Missing a day is neutral in the UI — no red, no broken streak display
- Archive view: calendar heatmap of logged days (GitHub-style, but warm/positive)
- No guilt states anywhere

**What stays:**
- Manual daily check-in
- Habit categories and cue types (from Habit V2)

**User stories:**
- As a user, I see at a glance how consistent each habit has been this month
- As a user, missing a day doesn't feel punishing — I just pick up from tomorrow
- As a user, I can look back and see how consistent I've been over the year

---

### 6. Goals (Unchanged in function, potential dashboard integration)

Goals V2 hierarchy stays. The change: goals become **the spine the dashboard connects to.**

Key metrics on the dashboard (km run, books read, etc.) should link back to relevant goals where possible.

**No structural changes planned for this feature.**

---

### 7. Email Morning Reminder (New)

A light, positive morning nudge. Not a guilt trip.

**Implementation:** Nodemailer + Gmail SMTP (free, no external service needed)

**Content:**
- Sent once per morning at one global time (~07:00 Europe/Brussels — no per-user scheduling; everyone is in the same timezone)
- The digest first syncs each connected user's Garmin data, then sends — so the email and the dashboard are fresh every morning
- Tone: warm, encouraging — "Hey, your week is shaping up well"
- Includes: yesterday's key metric (activity or sleep), today's training session if scheduled, one habit consistency highlight
- Ends with a single link back to the app

**User stories:**
- As a user, I get a morning email that makes me want to open the app
- As a user, the email never makes me feel bad about missed days
- As admin, I can enable/disable email reminders per user

---

## What We Are Not Building

- **Real-time bank integration** (Plaid/Nordigen) — out of scope, budget becomes planning-first
- **Daily expense tracking** — removed
- **Duolingo-style streak mechanics** — explicitly not doing this
- **Mobile app** — desktop only, unchanged
- **Public signup** — invite-only, unchanged
- **AI chat / agent features** — out of scope for this redesign

---

## Technical Scope

| Area | Change Type |
|---|---|
| Dashboard page | New |
| Garmin sync (unofficial Connect API via Node library) | New |
| Email reminders | New |
| Budget UI (no data model change) | Redesign |
| Training schedule UI | Redesign |
| Habits UI | Redesign |
| Goals | No change |
| Auth / multi-user | No change |
| DB schema | Additive (Garmin sync fields, sleep/calories tables) |
| Branch | `life-app-2.0` — new branch from `master` |

---

## Acceptance Criteria (Top Level)

- [ ] After login, the dashboard is the landing page — no extra clicks to see your metrics
- [ ] Dashboard loads key metrics without any manual logging (Garmin data)
- [ ] Syncing Garmin is a single button tap, deduplicates correctly
- [ ] Morning cron syncs all connected users, so data is fresh without anyone opening the app
- [ ] Training schedule shows today's session clearly, without noise
- [ ] Habits show a last-30-days consistency count on dashboard, no guilt states anywhere
- [ ] Budget is usable without daily entry — monthly/quarterly planning sessions only
- [ ] Morning email sends, is positive in tone, links back to app
- [ ] All features from 1.0 remain accessible
- [ ] `npm run build` passes, no TypeScript errors

---

## Open Questions

None — all clarifications resolved. Ready to proceed to planning phase.
