# Implementation Plan: Activity Calendar

**Feature Branch**: `006-activity-calendar`
**Spec**: `specs/006-activity-calendar/spec.md`
**Created**: 2026-10-04
**Status**: Ready for task breakdown

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 16, Drizzle ORM, existing palette (no new packages)
**Storage**: SQLite — existing `activity_logs` and `activity_types`
**Project Type**: web

Supporting notes: `research.md`, `data-model.md`, `contracts/calendar-api.md`, `quickstart.md`.

---

## Technical Context

| Concern | Decision |
|---|---|
| Completion storage | A check inserts an `activity_logs` row with `source = 'calendar'` and `duration_minutes = 0`. No new table. |
| Protecting real sessions | Uncheck deletes only `source = 'calendar'`. `manual` and `garmin` rows lock the checkbox and keep the mark. |
| One mark per day | The month query groups by activity type and date. No unique index, so two real sessions on one day still save. |
| Color and visibility | `calendar_color` and `calendar_visible` on `activity_types`. Color is a palette name. Defaults are applied for existing rows, including red for climbing and blue for running. |
| Dashboard | `activities.thisWeek` counts distinct activity-type-and-date pairs. That distinct count is dashboard-only. Zero without Garmin shows `0` and a link to `/this-week`. When the week has running distance, the large number stays the kilometres and the count is the smaller line. Sleep and calories stay as they are. |
| Navigation | Replaces the scheduled week and month in the sidebar. "This Week" (`/this-week`) is the check-off week. "Month" (`/monthly-plan`) is the check-off month. No third Calendar item. Scheduler code stays in the repo and is not deleted here. |
| Settings surface | Show, hide, and color live on the calendar page. They save through the existing `PATCH /api/activity-types/:id`. No new settings tab. |
| Schema rollout | `apply-schema.js` adds the columns idempotently and backfills `source`. |
| New packages | None. |

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Effectiveness over busyness | Pass | A check records what happened. Color means which activity, not how much. Empty days are not failures. No streaks or targets on this page. |
| II. Private-first, invite-only | Pass | Every query filters on `user_id`. |
| III. AI as advisor | Pass | No AI in this feature. |
| IV. Visual feedback over text | Pass | The month marks are the primary signal. The legend is there so color is not the only cue. |
| V. Simplicity | Pass | Reuses activity logs, activity types, and the palette. No calendar library. |
| VI. Modular design | Pass | The week and month pages change what they render. Scheduler APIs stay. A calendar row is still an activity log, so streaks, the digest, and goal counts that tally rows will see it. Distinct-day counting is limited to the dashboard week card, which is the count the spec requires. |

No gate failures.

---

## Design

### Check and uncheck

`PUT /api/calendar/check` is the only writer.

On check: if any log exists for this user, activity type, and date, return the current state and do not insert. Otherwise insert `source = 'calendar'`, `duration_minutes = 0`, empty metrics.

On uncheck: delete `source = 'calendar'` for that user, type, and date. If a `manual` or `garmin` row remains, return `checked: true, locked: true`.

Reject a date after today in `Europe/Brussels`, a hidden activity, or an activity that belongs to someone else. Today is `toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" })`, the same clock as `getBrusselsToday()` in `src/app/api/cron/morning-digest/route.ts`. Put that helper in `src/lib/dates.ts` and use it on the server and for the highlighted day in the grid, so the highlighted cell and the enabled checkbox are the same day. The production image does not set `TZ`. Railway is UTC. Belgium is two hours ahead until 25 October 2026, and one hour ahead after that.

The day panel updates optimistically, then reverts and shows a short inline failure if the request fails.

### Month

`GET /api/calendar?month=YYYY-MM` returns every activity type for the user (so hidden ones can be turned back on) and, for visible types only, one completion per type per day. `locked` is true when a non-calendar log exists.

The grid is a normal month. Today is distinct. Selecting a day opens that day's checklist. Future days show the list but the controls are disabled. Filter state lives in the page only. It is not saved.

A finished activity is a colored section with that activity's icon, not a small dot. On the week, each section is a full-width bar tall enough to see the icon. On the month, the same sections are smaller: up to three, then a `+` count. Order in the cell and in the day list is alphabetical by name and does not change when something is checked. The cell does not blend activities into one color. The legend shows the same icon and color. Days with no completions have no sections and no "missed" styling.

Turning a check on plays one short celebration for that activity. Turning it off does not. The motion is ease-out, under a second, and it does not play when the system is set to reduce motion. The named activities use these motions: Running sweep, Hiking rise, Tennis bloom, Climbing (Gym) climb, Climbing (Outdoor) peak, Reading open, Meditation ring, Journaling line, Social Event ripple. Any other activity keeps one motion from that set, chosen from its id so it does not change between visits.

The same marks render in week mode (seven days, Monday first) and month mode. Week mode is `/this-week`. Month mode is `/monthly-plan`. Both pages render `CalendarView`. The old scheduled views are no longer mounted. Their components and the scheduler APIs stay in the repo.

If every activity is hidden, the grid still renders and the day panel explains that at least one activity needs to be shown.

### Configure

A panel on the same page lists every activity, with a visibility toggle, the activity-icon set from `ACTIVITY_TYPE_ICONS`, and a palette swatch. Changes call `PATCH /api/activity-types/:id` with `calendarVisible`, `calendarColor`, or `icon`. A color or icon change repaints past days because the client reads both from the activity, not from the day.

`POST /api/activity-types` assigns `calendar_visible = 1` and a default palette color for types created later.

### Dashboard and history

In `src/app/api/dashboard/route.ts`, replace `weekLogs.length` with the size of a set of `activityTypeId + date`. Leave the kilometre sum as it is.

In `ActivityCard`, when Garmin is disconnected and the week count is zero, show `0` and a link to `/this-week`. When the count is above zero, show it whether or not Garmin is connected. If `kmRunThisWeek` is above zero, that distance stays the large number and the distinct count stays the smaller line. Do not change the sleep or calories cards.

The week window ends on the Brussels date, and its Monday is computed from that date, not from `new Date()` on a UTC server.

Other readers of `activity_logs` keep counting rows. A check can extend an Activities streak, add one to the morning digest total, and add one to a goal whose metric is a count. Duration goals add 0. That is accepted. Do not "fix" the digest or goal counters in this feature.

In `src/components/daily/daily-view.tsx`, a calendar row shows "Checked" instead of "0m", same as the Activities recent list.

In `GET /api/activities/summary`, include `source`. In `activities-dashboard.tsx`, render "Checked" instead of "0m" when `source` is `calendar` and duration is 0. Streak math may count that day. That is intended.

Garmin sync in `garmin-sync-apply.ts` sets `source: 'garmin'` on new activity logs.

### Layout

- Pages: `src/app/this-week/page.tsx` renders `CalendarView` in week mode. `src/app/monthly-plan/page.tsx` renders `CalendarView` in month mode. Both stay thin pages.
- `calendar-view.tsx` loads the month, holds the selected date, filter, and configure panel.
- `calendar-month.tsx` and `calendar-week.tsx` draw the grids and the colored icon sections. `activity-mark.tsx` is the shared section.
- `calendar-day-panel.tsx` is the checklist.
- `calendar-legend.tsx` is the color key and the single-activity filter.
- `calendar-configure.tsx` is show, hide, and color.
- Column stays within the app's normal page width. The month is the focus. Configure is closed until opened.
- Loading skeleton matches the month grid.
- Colors come from `usePalette()` / palette CSS variables. No hardcoded hex in the components.

---

## Constitution Check (after design)

The design still passes. The dashboard count change is the one cross-feature effect, and it is the behavior the spec requires. No principle needs an exception.

---

## Implementation Phases

### Phase 1 — Schema

1. Add `calendar_visible`, `calendar_color`, and `activity_logs.source` in `apply-schema.js`. `apply-schema.js` runs on every container start, and a later `UPDATE` is not skipped. Guard the color map and the manual/garmin split with `PRAGMA table_info`, the same way this file guards the `is_log_entry` rename. Apply the name-to-color map only on the run where `calendar_color` was absent. Apply "garmin id means garmin, everything else means manual" only on the run where `source` was absent. On later boots, the only source update allowed is `source = 'garmin'` where `garmin_activity_id` is set. Never rewrite `calendar_color`, and never set a `calendar` row back to `manual`.
2. Add the same columns in `src/db/schema.ts`. Column default for `calendar_color` may be `blue`. That default is only for a brand-new row that forgot to set a color. It is not the color map.
3. Extend the activity type and log types in `src/types/index.ts`.
4. Call `defaultCalendarColor(name, id)` from `src/lib/seed-user-defaults.ts`, `seedDefaultActivityTypes` in `src/app/api/activity-types/route.ts`, `ensureActivityType` in `src/lib/garmin-sync-apply.ts`, and `POST /api/activity-types`. A new friend's Climbing (Gym) is red and Running is blue without a settings step.

**Gate**: Restart the dev server. Confirm the new columns and `source = 'garmin'` on rows that have a Garmin id. Change Running's color, restart again, and confirm it is still the color you set. Create a fresh user and confirm Climbing is red and Running is blue.

### Phase 2 — Write and read a day

4. `GET /api/calendar` and `PUT /api/calendar/check`.
5. Calendar page, sidebar entry, day checklist, optimistic check, future-day lock.

**Gate**: Check today, refresh, it is still checked. A second check does not add a row. Yesterday works. A future day is rejected. Raw row has `source = 'calendar'`.

### Phase 3 — Month color

6. Week and month grids, colored icon sections, legend, filter, quiet empty days.

**Gate**: Two activities on one day show two icon sections. Filter hides the other. An empty day has no section and no failure styling. Checking one does not reorder the list.

### Phase 4 — Configure

7. Extend activity-type PATCH and POST. Configure panel. Default colors for new types.

**Gate**: Hide an activity, change a color, refresh. Past days follow. Turning it back on restores old marks.

### Phase 5 — Dashboard and history

8. Distinct week count and the zero-state calendar link.
9. Garmin inserts set `source`. Recent activities say "Checked" for a calendar row.

**Gate**: Walk `quickstart.md` from step 11 through step 14.

---

## Files to Create

| File | Purpose |
|---|---|
| `src/app/api/calendar/route.ts` | Range read (`from` and `to`) |
| `src/app/api/calendar/check/route.ts` | Check and uncheck |
| `src/components/calendar/calendar-view.tsx` | Week or month mode, selected day, filter |
| `src/components/calendar/activity-mark.tsx` | Colored icon section, and the stable mark order |
| `src/components/calendar/calendar-week.tsx` | Seven-day grid and icon sections |
| `src/components/calendar/calendar-month.tsx` | Month grid, up to three sections, then a count |
| `src/components/calendar/calendar-day-panel.tsx` | Checklist |
| `src/components/calendar/calendar-legend.tsx` | Legend and filter |
| `src/components/calendar/calendar-configure.tsx` | Visibility and color |
| `src/lib/calendar-colors.ts` | Default palette name for an activity |
| `src/lib/calendar-summary.ts` | Distinct week count |

## Files to Modify

| File | Change |
|---|---|
| `apply-schema.js` | New columns. One-shot color map and source split, guarded by `PRAGMA table_info` |
| `src/db/schema.ts` | Drizzle columns |
| `src/types/index.ts` | Fields on activity type, log, and dashboard payload if needed |
| `src/lib/dates.ts` | `brusselsToday()`, and week start derived from that date |
| `src/app/this-week/page.tsx` | Render the week check-off instead of the scheduled week |
| `src/app/monthly-plan/page.tsx` | Render the month check-off instead of the scheduled month |
| `src/components/layout/app-sidebar.tsx` | Rename Monthly Plan to Month. Leave This Week. Do not add a third item |
| `src/lib/seed-user-defaults.ts` | Default calendar color on first login |
| `src/lib/garmin-sync-apply.ts` | Default color in `ensureActivityType`, and `source: "garmin"` on new logs |
| `src/components/daily/daily-view.tsx` | "Checked" instead of "0m" for a calendar row |
| `src/app/api/activity-types/route.ts` | Default color on create |
| `src/app/api/activity-types/[id]/route.ts` | Accept visibility and color |
| `src/app/api/dashboard/route.ts` | Distinct week count |
| `src/components/dashboard/dashboard-cards.tsx` | Zero state links to `/this-week`. Kilometres stay the headline when distance exists |
| `src/app/api/activities/summary/route.ts` | Include `source` |
| `src/components/activities/activities-dashboard.tsx` | "Checked" label |
| `specs/master/data-model.md` | Document the new columns |
| `specs/master/contracts/api-routes.md` | Document the new routes |
