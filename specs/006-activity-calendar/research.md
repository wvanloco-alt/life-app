# Research: Activity Calendar

**Feature**: `006-activity-calendar`
**Date**: 2026-10-04

## 1. Where a check is stored

**Decision**: A calendar check is a row in the existing `activity_logs` table with `source = 'calendar'` and `duration_minutes = 0`. It is not a new table.

**Rationale**: The dashboard, the activity history, and Garmin already read `activity_logs`. A second completion table would split "what did I do?" across two places, which is the complexity this feature is meant to avoid.

**Alternatives considered**:
- A new `calendar_checks` table. Rejected. The dashboard would have to merge two sources, and a check would be invisible to the rest of the app.
- Reuse a scheduled `activities` row and mark it complete. Rejected. Those rows come from the scheduler and roles. This calendar must work for someone who never plans a week.

## 2. How a check differs from a real session

**Decision**: Add `activity_logs.source` with three values: `calendar`, `manual`, `garmin`. Existing rows are backfilled: `garmin` when `garmin_activity_id` is set, otherwise `manual`. New Garmin imports write `garmin`. The detailed log form keeps writing `manual`.

**Rationale**: `duration_minutes` is required today, so a check has to store a number. Zero minutes is not a safe marker by itself, because a real log could also be short. `source` is the marker. Uncheck deletes only `source = 'calendar'` rows for that user, activity, and date. Garmin and manual rows stay, and the day stays marked.

**Alternatives considered**:
- A boolean `is_calendar_check`. Rejected. Garmin vs manual is the same kind of fact, and one column covers all three.
- Delete every log for that activity and date on uncheck. Rejected. That would erase a watch import.

## 3. One mark per activity per day

**Decision**: Do not add a unique index on `(user_id, activity_type_id, date)`. Two Garmin runs on the same day must still both be stored. The check handler inserts a `calendar` row only when that user has no log at all for that activity and date. The month view groups logs into one mark per activity per day.

**Rationale**: The spec limits the mark, not the underlying sessions. A unique index would reject a second real run.

**Alternatives considered**:
- Unique index, and fold Garmin duplicates into one row. Rejected. That changes Garmin sync.

## 4. Color and visibility

**Decision**: Add `calendar_visible` (default on) and `calendar_color` to `activity_types`. Color is a palette name from `src/lib/palette.ts` (`red`, `blue`, `amber`, and the other existing names), not a hex code. Defaults for the seeded names:

| Activity | Color |
|---|---|
| Climbing (Gym), Climbing (Outdoor) | `red` |
| Running | `blue` |
| Tennis | `lime` |
| Hiking | `emerald` |
| Reading | `amber` |
| Meditation | `purple` |
| Journaling | `pink` |
| Social Event | `cyan` |

Any other name cycles the palette by id. Existing rows get these values in the schema migration. New activity types created later get the next palette color and `calendar_visible = 1`.

**Rationale**: The spec says colors come from the app's accents, and the first check needs no setup. Climbing red and running blue match the example that started the feature. Storing the color on the activity type means a change repaints past days with no per-day update.

**Alternatives considered**:
- A separate settings table. Rejected. Visibility and color belong to the activity.
- Free hex input. Rejected by the spec and by the warm-palette design system.
- Per-day colors. Rejected. Color means "this activity," not "this day."

## 5. Dashboard count

**Decision**: `activities.thisWeek` becomes the number of distinct `(activity_type_id, date)` pairs in the current week, not the number of log rows. Kilometres run still sum every running log. Sleep and calories are unchanged.

**Rationale**: The spec says a calendar check and a Garmin import of the same activity on the same day count once. Today `thisWeek` is `weekLogs.length`, so two runs on Monday count as two. The week card, when Garmin is disconnected and the count is zero, shows `0` and a link to `/this-week` instead of only "Connect Garmin." When the week has running distance, kilometres stay the large number. Digest totals and goal counts still count rows.

**Alternatives considered**:
- Leave `thisWeek` as a row count and add a second field. Rejected. The card the user sees would still double-count.
- Invent sleep or calories from checks. Rejected by the spec.

## 6. What stays untouched

**Decision**: No changes to habits, roles, goal planning, or the shape of the detailed log form. The scheduled week and month leave the sidebar. Their code stays. The recent-activity list and This Week's completed-activity line show a calendar check as "Checked" instead of "0m". Existing activity streaks will treat a check as a logged day. That is accepted, because the check means the activity happened. Digest and goal counters keep counting rows.

**Rationale**: Scope is additive. Hiding calendar rows from streaks would make the check a second, secret kind of completion.

## 7. One-shot backfill, new accounts, and the day boundary

**Decision**: Color assignment and the manual/garmin source split run only on the boot where `PRAGMA table_info` shows the new column was missing. Later boots may set `source = 'garmin'` where `garmin_activity_id` is present, and must not touch `calendar_color` or `source = 'calendar'`. `defaultCalendarColor` is used by first-login seed, the activity-types GET seed, Garmin's `ensureActivityType`, manual create, and that one-shot migration. Today is `Europe/Brussels`, matching the morning digest.

**Rationale**: `apply-schema.js` runs on every Railway start. An unguarded update would erase a chosen color and turn calendar checks into manual rows. The column default `blue` would otherwise be what a new friend sees. The production container has no `TZ` and runs UTC.

**Alternatives considered**:
- Trust `ADD COLUMN ... DEFAULT` and skip a color map. Rejected. Climbing and Running would both be blue.
- Compare dates to the server clock. Rejected. From local midnight to 02:00 the check would be rejected as a future day.

## 8. Where the calendar lives

**Decision**: The check-off week replaces This Week. The check-off month replaces Monthly Plan, labeled "Month". The scheduler is not deleted.

**Rationale**: A third item named Calendar sits next to This Week and reads as the planner. The scheduled calendars are unused. Replacing the screens is the product change. Deleting the scheduler in the same feature is a rewrite.

**Alternatives considered**:
- A new `/calendar` route beside This Week and Monthly Plan. Rejected after review.
- Delete the scheduler now. Rejected. It can be redesigned later, and this feature does not need it gone to be useful.

## 9. Dependencies

**Decision**: No new packages. The month grid is built with the date helpers and components already in the app.

**Rationale**: A personal calendar for a small group does not need a calendar library.
