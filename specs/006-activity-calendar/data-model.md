# Data Model: Activity Calendar

**Feature**: `006-activity-calendar`
**Date**: 2026-10-04

No new tables. Two existing tables gain columns.

## `activity_types` (extended)

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `calendar_visible` | INTEGER | NOT NULL, default `1` | `1` shown on the calendar, `0` hidden. Completions are kept either way. |
| `calendar_color` | TEXT | NOT NULL, default `'blue'` | Palette name: `blue`, `green`, `amber`, `red`, `purple`, `pink`, `cyan`, `lime`, `emerald`, `gray`, `indigo`, `sky`. |

**Rules**:
- One row per activity the user already has. This feature does not create a parallel list.
- Hiding a type does not delete logs.
- Deleting a type keeps the current delete behavior. The calendar only draws types that still exist, so a removed type cannot leave a broken mark.
- New types default to visible, with a palette color assigned in the create path.

## `activity_logs` (extended)

| Column | Type | Constraints | Meaning |
|---|---|---|---|
| `source` | TEXT | NOT NULL, default `'manual'` | `calendar`, `manual`, or `garmin`. |

**Rules**:
- A calendar check inserts one row: `source = 'calendar'`, `duration_minutes = 0`, `metrics = '{}'`, no Garmin id, no goal, no scheduled activity. Only when that user has zero logs for that `activity_type_id` and `date`.
- Uncheck deletes rows for that user, type, and date where `source = 'calendar'` only.
- The day is checked when any log exists for that user, type, and date.
- The checkbox is locked when any of those logs has `source` other than `calendar`.
- There is no unique index on `(user_id, activity_type_id, date)`. Multiple real sessions on one day remain valid. The calendar still draws one mark.
- A future date is rejected by the check endpoint. Past dates and today are allowed. Today is the calendar date in `Europe/Brussels`, not the server's UTC date.
- Queries always include `user_id = session.user.id`.

**Backfill** when the column is added:
- `garmin_activity_id` is not null → `garmin`
- otherwise → `manual`

**State of one activity on one day**:

1. No logs → unchecked, can be checked if the date is today or earlier and the type is visible.
2. Only `calendar` logs → checked, can be unchecked.
3. Any `manual` or `garmin` log → checked and locked. A check does not insert another row.

## Derived read model (not stored)

A month is a list of days. Each day has the set of visible activity type ids that have at least one log. Color and name come from the activity type at read time, so changing a color repaints history.
