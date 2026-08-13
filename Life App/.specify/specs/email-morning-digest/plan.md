# Implementation Plan: Email Morning Digest

**Feature**: `email-morning-digest`
**Created**: 2026-08-13
**Branch**: `life-app-2.0`
**Spec**: `.specify/specs/email-morning-digest/spec.md`

---

## What already exists

| Asset | Location | Reuse / Change |
|---|---|---|
| `emailPreferences` table | `src/db/schema.ts` | Modify: add 3 columns via `apply-schema.js` |
| `GarminConnection` component | `src/components/settings/garmin-connection.tsx` | Reference pattern for settings UI |
| `SettingsPage` | `src/components/settings/settings-page.tsx` | Add email digest section |
| `runGarminSyncForUser()` | `src/lib/garmin-sync-apply.ts` (line ~185) | Import directly in the cron endpoint — no HTTP call |
| `GET /api/today/sessions` | `src/app/api/today/sessions/route.ts` | Reference for session query |
| `apply-schema.js` | root | Add 3 `ALTER TABLE ADD COLUMN IF NOT EXISTS` |
| `railway.toml` | root | **Unchanged** — Railway cron is a separate dashboard-configured service, not a config-file entry |
| `DEPLOYMENT.md` | root | Document env vars + cron service setup |

## What is new

| Asset | Location | Purpose |
|---|---|---|
| `src/lib/mailer.ts` | new | Nodemailer transport singleton |
| `src/lib/digest-assembler.ts` | new | Queries DB, builds content object per user |
| `src/lib/email-template.ts` | new | Pure function: content → `{ html, text }` |
| `GET /api/email-preferences` | new | Read preferences for current user |
| `PATCH /api/email-preferences` | new | Write preferences for current user |
| `POST /api/cron/morning-digest` | new | Cron target: orchestrates sync + assemble + send |
| `EmailDigestSettings` component | new | Settings UI section |

**New dependency**: `nodemailer` + `@types/nodemailer`

---

## Architecture

### Data flow

```
Railway cron service (separate service, schedule "0 5,6 * * *" —
two UTC runs so 07:00 Brussels is hit year-round across DST;
curls the PUBLIC app URL, exits when done)
  → POST /api/cron/morning-digest  (x-cron-secret header)
       ├─ Check Brussels time ≥ 07:00 (else return 200 { skipped: "too early" }
       │   — NOT 204: a 204 response cannot carry a JSON body)
       ├─ Query opted-in users (email_preferences WHERE enabled = true)
       ├─ Filter by cadence + day-of-week
       │   ├─ daily: always included
       │   └─ weekly: only if today is Monday
       │
       └─ For each user (sequential, not parallel — avoid Garmin rate limits):
            ├─ If Garmin connected → runGarminSyncForUser(userId, db)
            │    (reuse existing lib function, not HTTP call)
            ├─ digestAssembler.buildContent(userId, cadence, today)
            │    → DigestContent | null  (null = no data, skip)
            ├─ emailTemplate.render(content)
            │    → { html: string, text: string }
            ├─ mailer.send({ to, subject, html, text })
            └─ UPDATE email_preferences SET last_digest_sent_at = today
                WHERE user_id = userId

Response: { sent: N, skipped: N, errors: N }
```

### Schema changes (`apply-schema.js`)

Three `ALTER TABLE ADD COLUMN IF NOT EXISTS` statements on `email_preferences`:

```sql
ALTER TABLE email_preferences ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE email_preferences ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE email_preferences ADD COLUMN IF NOT EXISTS last_digest_sent_at TEXT;
```

Also update `src/db/schema.ts` Drizzle definition to match.

---

## Module Designs

### `src/lib/mailer.ts`

Nodemailer transport, created once and reused:

```typescript
import nodemailer from "nodemailer";

// ponytail: singleton — nodemailer recommends reusing the transport
let _transport: nodemailer.Transporter | null = null;

export function getMailer() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return _transport;
}

export async function sendMail(opts: {
  to: string; subject: string; html: string; text: string;
}) {
  await getMailer().sendMail({
    from: `"Life App" <${process.env.GMAIL_USER}>`,
    ...opts,
  });
}
```

---

### `src/lib/digest-assembler.ts`

Pure DB queries, no I/O side effects (except DB reads). Returns `null` if no content sections exist for the user.

```typescript
export interface DigestContent {
  userName: string;
  cadence: "daily" | "weekly";
  // Daily fields
  sleep?: { score: number; durationMinutes: number };
  activity?: { count: number; kmRun?: number };
  todaySession?: { sport: string; phaseName: string; durationMinutes: number };
  habitHighlight?: { name: string; doneLast30: number };
  // Weekly-only fields
  weekSessions?: { sport: string; count: number; kmRun?: number }[];
  weekSleepAvg?: number;
  topHabits?: { name: string; doneLast30: number }[];
  appUrl: string;
}

export async function buildDailyContent(userId: string, today: string, db): Promise<DigestContent | null>
export async function buildWeeklyContent(userId: string, weekStart: string, db): Promise<DigestContent | null>
```

Both functions return `null` when all optional fields are absent (so the cron can skip sending).

Query breakdown:
- `sleep`: `SELECT score, duration_minutes FROM sleep_logs WHERE user_id = ? AND date = yesterday LIMIT 1` (unique index on user+date)
- `activity`: `SELECT * FROM activity_logs WHERE user_id = ? AND date = yesterday` — count = row count; km = parse each row's `metrics` JSON text column and sum `distance_km` (there is **no** `distance_km` column; the Garmin sync writes distance into the `metrics` JSON)
- `todaySession`: same query as `GET /api/today/sessions` but direct DB call (not HTTP) — the date column is `activities.activity_date`, not `date`
- `habitHighlight`: `SELECT h.name, COUNT(hl.id) as done FROM habits h LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.date >= 30daysAgo AND hl.date <= today WHERE h.user_id = ? AND h.is_archived = 0 GROUP BY h.id ORDER BY done DESC LIMIT 1`
- Weekly variants: same queries with date ranges spanning the previous ISO week

---

### `src/lib/email-template.ts`

Pure function. No DB, no I/O. Takes `DigestContent`, returns `{ html: string, text: string }`.

**HTML structure** (inline styles — email clients strip `<style>` tags):

```
max-width: 560px, margin: auto, background: #faf9f7, font-family: Georgia, serif
├─ Greeting: "Good morning, {name} —"  (large, warm amber #c2813a)
├─ [sleep section if present]
├─ [activity/session section if present]  
├─ [habit highlight if present]
└─ → Open Life App  (text link, warm amber)
```

Each section is a `<p>` block. No tables, no images, no `<div>` nesting beyond the outer wrapper. This ensures maximum email client compatibility.

**Plain text**: same content, line-separated, `→` replaced with `>`, link as bare URL.

---

### `POST /api/cron/morning-digest`

```typescript
// 1. Auth check
const secret = request.headers.get("x-cron-secret");
if (secret !== process.env.CRON_SECRET) return 401;

// 2. Brussels time gate — 200, not 204 (204 must not carry a body)
const brusselsHour = new Date().toLocaleString("en-US", 
  { timeZone: "Europe/Brussels", hour: "numeric", hour12: false });
if (parseInt(brusselsHour) < 7) return NextResponse.json({ sent: 0, skipped: "too early" });

// 3. Today in Brussels
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" }); // "YYYY-MM-DD"
const isMonday = new Date().toLocaleDateString("en-US", 
  { timeZone: "Europe/Brussels", weekday: "long" }) === "Monday";

// 4. Query opted-in users
// 5. For each: sync → assemble → render → send → mark sent
// 6. Return { sent, skipped, errors }
```

---

## API Contracts

### GET /api/email-preferences
Auth-gated. Returns or creates the user's row.

```json
{ "email": "wim@example.com", "cadence": "daily", "enabled": true }
```

### PATCH /api/email-preferences
Auth-gated. Partial update — only provided fields are changed.

```json
// Request
{ "email": "wim@example.com", "cadence": "weekly", "enabled": false }

// Validation errors
{ "error": "Invalid email address" }         // 400
{ "error": "Cannot enable without email" }   // 400
```

Uses Drizzle `insert().onConflictDoUpdate()` for atomic upsert.

---

## Settings UI: `EmailDigestSettings`

Pattern mirrors `GarminConnection.tsx`:
- `useEffect` on mount: `GET /api/email-preferences` → populate local state
- Controlled `email` input + cadence radio group
- `handleSave`: `PATCH /api/email-preferences { email, cadence }` → show "Saved" confirmation
- `handleToggle`: `PATCH /api/email-preferences { enabled: !current }` — separate from save
- Disable toggle when `email` is empty or invalid

---

## Environment Variables (new)

| Var | Required | Description |
|---|---|---|
| `GMAIL_USER` | Yes | Gmail address used as sender |
| `GMAIL_APP_PASSWORD` | Yes | Gmail App Password (not regular password) |
| `CRON_SECRET` | Yes | Random secret string; must match Railway cron header |
| `NEXTAUTH_URL` | Already exists | Used to construct the app link in email |

---

## Railway Cron Setup (dashboard, not railway.toml)

Railway cron = a **separate service** with a Cron Schedule setting; it starts on schedule, runs its command, and must exit. `railway.toml` is not touched (it configures the always-on web service — a cron schedule on it would make Railway skip runs forever, since the web server never exits).

Setup (documented in `DEPLOYMENT.md`, performed in the Railway dashboard):

1. New service in the same project, no repo — start command only:
   `curl -fsS -X POST https://<public-app-url>/api/cron/morning-digest -H "x-cron-secret: $CRON_SECRET"`
   (public URL — a separate service cannot reach the web service via `localhost`)
2. Settings → Cron Schedule: `0 5,6 * * *`
3. Service env var: `CRON_SECRET` (same value as the web service)

**Why `0 5,6 * * *`**: Railway cron is UTC. Summer: 05:00 UTC = 07:00 Brussels → first run sends, second is a no-op (idempotency). Winter: 05:00 UTC = 06:00 Brussels → gate rejects, 06:00 UTC = 07:00 Brussels → sends. A single 05:00 UTC run would send nothing all winter. The gate now returns 200, so `curl -f` doesn't flag the too-early run as a failure.

---

## Constitution Check

| Constraint | Status |
|---|---|
| No new tables | ✅ Additive columns only on existing table |
| Auth on every route | ✅ Both preference routes auth-gated; cron route secret-gated |
| User scoping | ✅ All DB queries filter by `user_id` |
| No external services | ✅ Gmail SMTP via Nodemailer — no paid third-party service |
| Simplicity | ✅ Sequential per-user processing, no queue, no worker threads |
| Per-user isolation | ✅ Each user's email contains only their own data |
| Positive framing | ✅ Spec tone rules enforced in `email-template.ts` — no guilt copy |
