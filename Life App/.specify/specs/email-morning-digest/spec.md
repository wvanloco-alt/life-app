# Feature Specification: Email Morning Digest

**Feature**: `email-morning-digest`
**Created**: 2026-08-13
**Status**: Implemented
**Branch**: `life-app-2.0`

---

## Why This Exists

The dashboard is the passive half of the stickiness loop — it rewards you for opening the app. The email is the active half — it pulls you back when you haven't opened it. Without it, the app only works for people who already remember to check it daily. Most people don't.

The email is not a notification. It's a morning briefing: warm, brief, personal. It should feel like a text from a friend who's been tracking your week, not a SaaS alert.

---

## What It Does

Once per morning, the system:
1. Syncs Garmin data for every user who has Garmin connected (so last night's tennis match is already in the data before the email goes out)
2. Sends a personalized email to every user who has opted in
3. Content adapts based on cadence preference: daily summary or Monday weekly review

Users configure their email address and cadence preference in Settings. The cron fires at 07:00 Europe/Brussels every day. On non-Monday days, only daily subscribers receive an email. On Mondays, both daily and weekly subscribers receive one (weekly subscribers get the week-in-review version).

---

## Email Content

### Daily email

Subject: `Good morning, {username} — here's your day`

Body sections (in order):
1. **Yesterday** — three stat rows: sleep (duration + score), calories (total + active), activity (sport name, distance if applicable). Sleep and activity are shown together — not either/or.
2. **Month so far** — pill row with session count, habit days logged, average sleep score, average daily steps for the current calendar month.
3. **Today's session** — if a training session is scheduled: sport + duration + phase. Omitted entirely if nothing scheduled.
4. **Today's concept** — one concept from the Library, shown as a card: title, WHAT text, HOW text. Topic is matched to yesterday's sport (e.g. tennis played → Tennis library). If no sport match or topic is excluded, falls back to Habit Design (if habits are absent or low-consistency), then to any non-excluded topic at random. Bookmarked items are preferred over non-bookmarked.
5. **CTA**: `Open Life App →` amber button.

### Weekly email (Mondays only)

Subject: `{username} — your week in review`

Body sections:
1. **Last 7 days** — sessions by sport, average sleep score, top 2 habits by 30-day consistency, today's session if scheduled.
2. **Month so far** — same pill row as daily.
3. **Today's concept** — same library segment logic as daily.
4. **CTA**: `Open Life App →` amber button.

### Tone rules

- Every data point is framed positively or neutrally. Never "you only ran once" — just "1 run this week."
- If a section has no data, omit it silently. No "no data available" copy.
- Short sentences. Plain language. No marketing copy.
- Plain text fallback alongside HTML.

### Email visual design

- Table-based layout (inline styles throughout) for maximum email client compatibility
- Background: `#faf8f5`, card background: `#ffffff`, border: `#ede9e2`
- Max width: 560px, centered
- Font: `-apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif` for body; `Georgia, Times New Roman, serif` for heading and concept body text
- Accent: `#c2813a` amber; accent light: `#fdf3e7` for concept card background
- Section labels in `11px` uppercase spaced caps, `#b8a99a`
- Stat rows: emoji icon + label left, value + sub-value right, separated by subtle `1px` border
- Month pills: small inline amber-on-light-amber chips
- Concept card: amber title + serif `what` paragraph + sans `how` paragraph on `#fdf3e7` background
- CTA: amber filled button (`#c2813a` bg, white text)
- No images, no logos, no hero banners
- No footer unsubscribe link (private invite-only app — preferences managed in Settings)

---

## Settings UI

Settings has been refactored into a tab-based layout. The main `/settings` page shows six cards (Roles, Activity Types, Scheduler, Garmin, Email digest, Password), each linking to a dedicated sub-page. The old inline-on-main-page pattern is gone.

**Email digest tab** (`/settings/email`):

```
Email digest
────────────────────────────────────────────────
Email address    [wim@example.com          ]
Cadence          (•) Daily   ( ) Weekly (Mon)
                 [Save]
────────────────────────────────────────────────
Enable digest                          [toggle]
────────────────────────────────────────────────
Library concepts
  Tennis         [toggle on ]
  Climbing       [toggle off]
  Running        [toggle on ]
  Habit Design   [toggle on ]
  Breathing      [toggle on ]
  Budget         [toggle on ]
────────────────────────────────────────────────
```

- Email + cadence saved together on submit
- Enable toggle disabled until a valid email is saved
- Library concept toggles: on = topic can appear in digest, off = excluded. Saves instantly (optimistic update, no save button needed)
- Default: all topics on

---

## Schema Change

`email_preferences` already exists with `id`, `user_id`, `enabled`, `created_at`, `updated_at`. Additive columns added:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `email` | TEXT | NULL | The user's preferred email address for the digest |
| `cadence` | TEXT | `'daily'` | `'daily'` or `'weekly'` |
| `last_digest_sent_at` | TEXT | NULL | ISO 8601 timestamp; idempotency guard |
| `excluded_library_topics` | TEXT | NULL | JSON array of topic slugs to exclude from the concept segment |

---

## API

### PATCH /api/email-preferences
Update the current user's email preferences. Auth-gated. Upserts the row.

**Request body**: `{ email?: string, cadence?: "daily" | "weekly", enabled?: boolean }`
**Validation**: if `email` is present, must be a valid email format. If `enabled: true` is sent without a stored email, return 400.

### GET /api/email-preferences
Returns the current user's email preferences. Auth-gated.

**Response**: `{ email: string | null, cadence: "daily" | "weekly", enabled: boolean }`

### POST /api/cron/morning-digest
The cron endpoint. Protected by a `CRON_SECRET` header — only callable with the correct secret (stored as an env var). Not callable by regular users.

**Logic**:
1. Determine today's date in Europe/Brussels timezone
2. Query all users where `email_preferences.enabled = true`
3. Filter by cadence: daily users always included; weekly users only included if today is Monday
4. For each user with Garmin connected: run Garmin sync (same logic as `POST /api/garmin/sync`)
5. For each user: assemble email content from fresh data
6. Send via Nodemailer + Gmail SMTP
7. Return `{ sent: number, errors: number }` — log any per-user failures but do not abort the whole batch

---

## Infrastructure

### Nodemailer + Gmail SMTP

- Package: `nodemailer` (already a standard Node.js library, no exotic dependencies)
- Auth: Gmail App Password (not the regular Gmail password — generated in Google Account → Security → 2-Step Verification → App passwords)
- Config via env vars: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- The `from` address is the Gmail account: `"Life App" <wim@gmail.com>`

### Railway cron (corrected 2026-08-13)

Railway has **no cron section in `railway.toml`** — `railway.toml` stays untouched (it configures the always-on web service; adding a cron schedule to it would break the app, since Railway expects cron services to run and exit). Cron on Railway is a **Cron Schedule setting on a separate service**, created in the Railway dashboard:

- A second service in the same Railway project (no repo needed — a one-liner image/start command)
- Start command: `curl -fsS -X POST https://<public-app-url>/api/cron/morning-digest -H "x-cron-secret: $CRON_SECRET"` — the **public URL**, not `localhost` (a separate service's container cannot reach the web service via localhost)
- Cron Schedule: `0 5,6 * * *` (05:00 **and** 06:00 UTC daily)
- Env var on the cron service: `CRON_SECRET` (same value as the web service)
- The command runs and exits — exactly what Railway cron requires

**Why two runs (DST handling)**: Railway cron is UTC; Brussels is UTC+1 in winter, UTC+2 in summer. The endpoint gate ("only process if ≥ 07:00 in Europe/Brussels") combined with per-user idempotency makes two runs safe and exactly one effective:

| Season | 05:00 UTC run | 06:00 UTC run |
|---|---|---|
| Summer (CEST, UTC+2) | 07:00 Brussels → **sends** | 08:00 Brussels → no-op (already sent) |
| Winter (CET, UTC+1) | 06:00 Brussels → gate rejects | 07:00 Brussels → **sends** |

A single 05:00 UTC run would silently send nothing all winter (the gate would reject the only run of the day).

The idempotency check: store `lastDigestSentAt` on `email_preferences`. If `lastDigestSentAt` is already today's date in Brussels time, skip that user.

---

## User Scenarios & Testing

### User Story 1 — Configure and enable digest (P1)

The user navigates to Settings, enters their email, selects "Weekly," saves, then flips the enable toggle.

**Acceptance scenarios**:
1. **Given** the user has no email configured, **When** they open Settings, **Then** the enable toggle is present but disabled with the hint "Enter an email address first."
2. **Given** the user enters a valid email and clicks Save, **When** the save succeeds, **Then** the enable toggle becomes active and a confirmation note appears ("Preferences saved").
3. **Given** the user enters an invalid email (no `@`), **When** they click Save, **Then** an inline validation error appears and the request is not sent.
4. **Given** the user has email configured and enabled, **When** they disable the toggle, **Then** `PATCH /api/email-preferences { enabled: false }` is called and no further emails are sent.

---

### User Story 2 — Daily digest received (P2)

A user with daily cadence wakes up, opens their email, and sees a concise summary of yesterday + today's session.

**Acceptance scenarios**:
1. **Given** the cron fires on a Tuesday, **When** the digest is assembled, **Then** the email contains yesterday's sleep score (if available) and today's scheduled session (if any).
2. **Given** no session is scheduled today, **When** the email is assembled, **Then** the "Today's session" section is omitted entirely — no placeholder text.
3. **Given** the user has no Garmin connected, **When** the digest is assembled, **Then** the email falls back to activity count from `activity_logs` for yesterday. If no activity data exists, the activity section is omitted.
4. **Given** the email is sent, **When** the user opens it on mobile, **Then** the email renders cleanly at 375px width with no horizontal scroll.

---

### User Story 3 — Weekly digest on Monday (P3)

A weekly subscriber receives their Monday email with the full week in review.

**Acceptance scenarios**:
1. **Given** the cron fires on a Monday for a weekly subscriber, **When** the digest is assembled, **Then** the email covers Mon–Sun of the previous week.
2. **Given** the cron fires on a Wednesday, **When** processing weekly subscribers, **Then** no email is sent to weekly subscribers that day.
3. **Given** a user is a daily subscriber, **When** the cron fires on Monday, **Then** they receive the standard daily email (not the weekly version).

---

### User Story 4 — Garmin syncs before send (P4)

The user played tennis Tuesday evening. The Wednesday morning email includes the tennis session.

**Acceptance scenarios**:
1. **Given** a Garmin activity was recorded after midnight on Tuesday, **When** the Wednesday cron fires, **Then** the Garmin sync runs before email assembly, and the Tuesday tennis session appears in the email.
2. **Given** Garmin sync fails for one user (network error), **When** the batch continues, **Then** the other users' emails are still sent. The failed user's email is sent with whatever data was already in the database.

---

### Edge Cases

- User has email configured but no data at all (new account) → all content sections omitted, email is just the link. Do not send if email would be completely empty — skip that user silently.
- Garmin sync takes too long → timeout after 30 seconds per user, proceed with existing data.
- Gmail SMTP fails → log the error, do not retry (will try again tomorrow).
- User changes cadence from daily to weekly mid-week → takes effect from the next applicable send.
- `lastDigestSentAt` is already today → skip (idempotency, protects against double-sends if cron fires twice).

---

## Requirements

- **FR-001**: `email_preferences` MUST gain `email TEXT` and `cadence TEXT DEFAULT 'daily'` columns via an additive migration.
- **FR-002**: `GET /api/email-preferences` MUST return the current user's email, cadence, and enabled state.
- **FR-003**: `PATCH /api/email-preferences` MUST validate email format and reject `enabled: true` when no email is stored.
- **FR-004**: The Settings page MUST include an "Email digest" section with email input, cadence radio, save button, and enable toggle.
- **FR-005**: The enable toggle MUST be disabled until a valid email is saved.
- **FR-006**: `POST /api/cron/morning-digest` MUST be protected by a `CRON_SECRET` header check and return 401 for unauthenticated calls.
- **FR-007**: The cron endpoint MUST sync Garmin for each connected user before assembling their email.
- **FR-008**: The cron endpoint MUST use `lastDigestSentAt` to skip users who have already received a digest today (idempotency).
- **FR-009**: Weekly digest MUST only be sent on Mondays. Daily digest MUST be sent every day.
- **FR-010**: All content sections (sleep, activity, session, habit) MUST be omitted silently when no data exists — no placeholder or "no data" copy.
- **FR-011**: The email MUST render correctly on mobile (max 560px, no horizontal scroll).
- **FR-012**: A plain text version MUST accompany the HTML email.
- **FR-013**: `DEPLOYMENT.md` MUST document the Railway cron service setup (separate service, public-URL curl command, `0 5,6 * * *` schedule, `CRON_SECRET` env var). `railway.toml` is NOT modified — Railway cron is a dashboard-configured separate service, not a config-file entry.
- **FR-014**: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `CRON_SECRET` MUST be documented in `DEPLOYMENT.md` as required env vars.

---

## Success Criteria

- **SC-001**: A user can configure their email address and cadence in Settings in under 60 seconds.
- **SC-002**: The cron endpoint processes all opted-in users and sends their emails within 2 minutes of being called.
- **SC-003**: Calling the cron endpoint twice on the same day results in exactly one email per user (idempotency verified).
- **SC-004**: A Garmin activity logged the previous evening appears in the next morning's email.
- **SC-005**: One user's Garmin sync failure does not prevent other users from receiving their email.
- **SC-006**: `npm run build` passes with no TypeScript errors after implementation.

---

## Assumptions

1. Display name = username as-is. No separate `displayName` column. If the username is "wvanloc", the email says "Good morning, wvanloc." A `displayName` field on users can be added later if desired.
2. The cron fires at 05:00 AND 06:00 UTC; the endpoint gate (≥ 07:00 Brussels) plus `lastDigestSentAt` idempotency yields exactly one send per user per day in both CET and CEST (see the DST table in Infrastructure).
3. Nodemailer is installed as a new dependency (it's not in the project yet).
4. `lastDigestSentAt` is added as a third additive column on `email_preferences` alongside `email` and `cadence`.
5. The "habit highlight" in the daily email is the single habit with the most completions in the last 30 days. Tie-broken by display order.
6. "Week in review" covers ISO Mon–Sun of the previous calendar week (not the last 7 days).

---

## Out of Scope

- Custom send time per user
- Email unsubscribe link (preferences are managed in Settings)
- Rich HTML email templates with images or logos
- Digest history / sent log viewable in the app
- Push notifications
- SMS
- Multiple email addresses per user
