# Implementation Plan: Calendar Picker

**Feature Branch**: `007-calendar-picker`
**Spec**: `specs/007-calendar-picker/spec.md`
**Created**: 2026-10-07
**Status**: Tasks written in `tasks.md`

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 16, Drizzle ORM, existing palette and Lucide icons (no new packages)
**Storage**: SQLite — existing `activity_types`
**Project Type**: web

Supporting notes: `research.md`, `data-model.md`, `contracts/calendar-picker.md`, `quickstart.md`.

---

## Technical Context

| Concern | Decision |
|---|---|
| What changes | The day list and Configure on the existing calendar. The week grid, month grid, legend, check rules, and dashboard stay. |
| Day list | The row is a `<button>`. No `Switch`. The same panel is on This Week and Month, because both pages render `CalendarView`. Unchecked: the Lucide icon in the activity color and the name on the quiet card. Checked: the palette color as the bar, with a white icon and a white name, the same light treatment `ActivityMark` already uses. Not a tint of the hue. |
| Order | Alphabetical by name, computed once. A click does not sort. |
| Locked and future | A locked completion is a marked row that is not a button, with the existing sentence. A future day renders the rows as disabled buttons. |
| Celebration storage | Nullable `activity_types.calendar_celebration`. Empty means no celebration. No backfill. The old CSS motions are removed. |
| Celebration playback | On a successful turn-on only, if the activity has an emoji. About 700ms, ease-out, one emoji. Reduced motion fades in place. A failed save clears it. Turn-off plays nothing. |
| Configure | One row: icon, name, color dot, emoji slot, Hide. One chooser open at a time. Hidden rows sit under a Hidden heading with Show. |
| Add activity | Configure posts `{ name }` to the existing `POST /api/activity-types`. That route gains a per-user duplicate-name check. Delete stays on the Settings page. |
| Schema rollout | `apply-schema.js` adds the column. Later boots do not write a default emoji. |

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Effectiveness over busyness | Pass | A mark still records one day. The emoji is optional, plays once, and has no count, streak, or sound. |
| II. Private-first, invite-only | Pass | Reads and writes stay scoped with `user_id`. The duplicate-name check is per user. |
| III. AI as advisor | Pass | No AI in this feature. |
| IV. Visual feedback over text | Pass | The colored row is the mark. Hide and Show are short words because a switch is what this feature removes. |
| V. Simplicity | Pass | One nullable column. Existing PATCH and POST. No new page and no new package. |
| VI. Modular design | Pass | Calendar components and the activity-type field. Check, week, and month behavior stay behind their current functions. |

No gate failures. Re-checked after the data model and the contract: still no failures.

---

## Design

### Day list

`CalendarDayPanel` stops rendering `Switch` and the `Celebration` motions (`sweep`, `rise`, `bloom`, and the rest).

Each visible activity is a `<button type="button">` so Enter and Space work without a custom key handler. `aria-pressed` is true when the day is marked.

Unchecked button: transparent background, border as today, Lucide icon colored with the palette value, name in the normal foreground color.

Checked button: background is the palette color. Icon and name are white, matching `ActivityMark`. Do not mix the name toward a pale version of the hue. Keep `ActivityMark` for the week, month, and legend so those cells do not gain a name label. The day row draws its own bar.

Future: `disabled` on every row, plus the existing sentence. Enter and Space do nothing and play nothing.

Locked: a `<div>` that looks checked, not a button, plus "Logged in detail or from Garmin — cannot remove from here". Enter and Space do nothing and play nothing.

Pending saves disable that row. Failure sets the existing "Could not save. Try again." and drops the emoji. The row returns to the state from before the click.

### Emoji

`src/lib/celebration-emojis.ts` exports the twelve tokens, the character for each, and `isCelebrationEmoji`. `null` is the empty state. The client never accepts a token from outside this list.

Playback lives in the day panel. It renders the character above the row for 700ms with a transform and opacity animation named `calendar-emoji`. Clearing the row removes that character immediately. `prefers-reduced-motion` uses a fade-only animation on this class. Do not put `calendar-emoji` under the old rule that sets `animation: none` on `.calendar-celebrate-motion`, or the fade will never play. Delete `NAMED_CELEBRATIONS` and the old `calendar-sweep`, `calendar-rise`, `calendar-bloom`, `calendar-ring`, `calendar-settle`, `calendar-glow`, `calendar-lift`, `calendar-ripple`, and `calendar-ink` keyframes, and the classes that referenced them.

### Configure

`CalendarConfigure` receives `onCreate(name: string)` as well as `onChange`.

Shown activities, alphabetical. Hidden activities under a "Hidden" heading, also alphabetical. Omit the heading when the hidden list is empty. Hide sends `{ calendarVisible: false }`. Show sends `{ calendarVisible: true }`. Paint the new icon, color, emoji, or visibility only after the PATCH succeeds. On failure, leave the previous row and show the error.

The icon button opens `ACTIVITY_TYPE_ICONS` under that row only. The color button opens `PALETTE_VARS` under that row only. The emoji button opens None, then the twelve characters, under that row only. State is one value: `{ activityId, kind: "icon" | "color" | "emoji" } | null`.

The emoji slot shows the character, or an empty circle when null. Choosing None sends `{ calendarCelebration: null }`.

"Add an activity" is a text field and a save button at the bottom. Empty input does not call the server. Send the trimmed name. A 409 shows "That name is already used." Do not insert a row until the response is 201. A created activity is inserted into the shown list from the refreshed calendar response.

`CalendarView.handleConfigureChange` already patches `/api/activity-types/:id`. Extend the patch type with `calendarCelebration?: string | null`. Add `handleCreate` for `POST /api/activity-types` with `{ name }` and then reload the calendar query.

### Server

`GET /api/calendar` adds `celebration: string | null` on each activity. Map an unknown stored value to `null` so a bad row cannot crash the page.

`PATCH /api/activity-types/:id` accepts `calendarCelebration`. `null` clears it. Any other value must pass `isCelebrationEmoji`, or the route returns 400. When `icon` is present, it must be a `name` in `ACTIVITY_TYPE_ICONS`, or the route returns 400. Icons already stored are left alone until someone changes them.

`POST /api/activity-types` stores `name.trim()`. It rejects a name that matches an existing name for that user after trim and lower-case, with 409 and `{ error: "That name is already used." }`. A new row still gets `calendarVisible: true`, `defaultCalendarColor`, and the default icon `activity`. `calendarCelebration` is always null. Ignore a celebration sent on create.

No change to `PUT /api/calendar/check`.

### Schema

`activity_types.calendar_celebration` is nullable text. Drizzle field `calendarCelebration`. `apply-schema.js` adds it in the existing `alterStatements` list. Do not add a one-shot UPDATE, and do not add one on a later boot. Existing rows stay null. Suggested emojis are not written for Climbing, Running, or anyone else.

---

## Files

| File | Change |
|---|---|
| `Life App/src/db/schema.ts` | Add `calendarCelebration`. |
| `Life App/apply-schema.js` | Add the column. |
| `Life App/src/lib/celebration-emojis.ts` | Token list, characters, guard. |
| `Life App/src/lib/__tests__/celebration-emojis.test.ts` | Guard accepts the twelve and rejects anything else. |
| `Life App/src/types/index.ts` | `calendarCelebration` on `ActivityType`. `celebration` on `CalendarActivity`. |
| `Life App/src/app/api/calendar/route.ts` | Return `celebration`. |
| `Life App/src/app/api/activity-types/[id]/route.ts` | Validate `calendarCelebration`. Reject an icon outside `ACTIVITY_TYPE_ICONS`. |
| `Life App/src/app/api/activity-types/route.ts` | Trim the name. Duplicate-name 409. Force a null celebration. |
| `Life App/src/components/calendar/calendar-day-panel.tsx` | Button rows. Emoji playback. Delete motion celebrations. |
| `Life App/src/components/calendar/calendar-configure.tsx` | One icon, one color, one emoji, Hide/Show, add by name. |
| `Life App/src/components/calendar/calendar-view.tsx` | Pass create handler. Include `calendarCelebration` in the patch. |
| `Life App/src/app/globals.css` | Replace the old celebration keyframes with `calendar-emoji`. |

Week, month, and legend files are not edited unless a type error forces the new `celebration` field to be ignored, which it should be.

---

## Out of scope for the builder

- Redesigning `ActivityMark` on the week or the month.
- A master "celebrate everything" switch.
- Seeding suggested emojis.
- Deleting an activity from Configure.
- Changing check locking, Brussels "today", or the dashboard.
