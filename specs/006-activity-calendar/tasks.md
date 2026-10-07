# Tasks: Activity Calendar

**Input**: `specs/006-activity-calendar/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/calendar-api.md`
**Branch**: `006-activity-calendar`
**Created**: 2026-10-04

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to ([US1]–[US4])

---

## Phase 1: Foundation

**Purpose**: Columns and types every story reads. No page work before this is done.

- [ ] T001 Add `calendar_visible`, `calendar_color` on `activity_types` and `source` on `activity_logs` in `Life App/apply-schema.js`. Guard the color map and the manual/garmin split with `PRAGMA table_info`: run them only on the boot where the column was absent. On later boots, the only source write allowed is `source = 'garmin'` where `garmin_activity_id` is set. Never rewrite `calendar_color` or a `calendar` row. Use the color map in `specs/006-activity-calendar/research.md` for that one-shot pass.
- [ ] T002 Add the same columns to the Drizzle tables in `Life App/src/db/schema.ts`
- [ ] T003 Add `calendarVisible`, `calendarColor`, and log `source` to the TypeScript types in `Life App/src/types/index.ts`
- [ ] T004 [P] Add `defaultCalendarColor(name, id)` in `Life App/src/lib/calendar-colors.ts` and `countDistinctActivityDays(logs)` in `Life App/src/lib/calendar-summary.ts`, with Vitest coverage in `Life App/src/lib/__tests__/calendar-summary.test.ts`

**Gate**: Restart the dev server. Confirm the new columns, Garmin rows have `source = 'garmin'`, and Climbing is `red` while Running is `blue`. Change Running's color, restart again, and confirm the new color survived. A fresh account gets the same default colors from the seed, not all-blue.

---

## Phase 2: User Story 1 — Check off what you did (P1)

**Goal**: Today and any past day can be checked in one action, and the check is still there after a refresh.

**Independent Test**: Check two activities for today, refresh, and confirm both persisted as `source = 'calendar'` with no duplicate row. Check yesterday. Confirm a future day cannot be checked.

- [ ] T005 [US1] Implement `GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` in `Life App/src/app/api/calendar/route.ts` per `contracts/calendar-api.md` (activities plus one completion per visible type per day, with `locked`)
- [ ] T006 [US1] Implement `PUT /api/calendar/check` in `Life App/src/app/api/calendar/check/route.ts` — insert a calendar log only when none exists, delete only `source = 'calendar'` on uncheck, reject dates after `brusselsToday()` from `Life App/src/lib/dates.ts` (`Europe/Brussels`), and reject hidden or foreign activity types. Add `brusselsToday()` in that dates module.
- [ ] T007 [P] [US1] In `Life App/src/components/layout/app-sidebar.tsx`, keep "This Week" at `/this-week` and rename "Monthly Plan" to "Month" at `/monthly-plan`. Do not add a third Calendar item.
- [ ] T008 [P] [US1] Point `Life App/src/app/this-week/page.tsx` and `Life App/src/app/monthly-plan/page.tsx` at `CalendarView` in week and month mode. Leave the old scheduled view components and the scheduler APIs in the repo. Do not delete them in this feature.
- [ ] T009 [US1] Create `Life App/src/components/calendar/calendar-view.tsx` — `mode` of `week` or `month`, load the matching date range, select today from `brusselsToday()`, loading skeleton shaped like that grid, pass the selected day into the checklist
- [ ] T010 [US1] Create `Life App/src/components/calendar/calendar-day-panel.tsx` — one switch per visible activity, alphabetical and stable when a switch changes, optimistic check and uncheck, a short per-activity celebration only when turning a check on (see the motion list in `plan.md`), no motion when reduced-motion is set, inline failure that reverts, future days visible but not checkable, locked when `locked` is true with the short explanation that a fuller session already exists

**Checkpoint**: US1 works without the month colors. A refresh keeps the checks. A second check does not add a row.

---

## Phase 3: User Story 2 — Read the month by color (P2)

**Goal**: The month shows one colored mark per activity, with a legend and a one-activity filter.

**Independent Test**: Check climbing on several days and running on others. Confirm two marks on a shared day, a legend, a climbing-only filter, and blank days with no failure styling.

- [ ] T011 [US2] Create `Life App/src/components/calendar/activity-mark.tsx`, `calendar-month.tsx`, and `calendar-week.tsx` — today distinct, one colored icon section per completed activity in alphabetical order, week sections full width, month shows three then a `+` count, no blended color, no tiny dots, no missed-day styling when a day is empty, click a day to select it
- [ ] T012 [US2] Create `Life App/src/components/calendar/calendar-legend.tsx` — each visible activity with its icon and color, click to filter to that activity, click again or a clear control to restore all sections
- [ ] T013 [US2] Wire the week or month grid, legend, and selected day together in `Life App/src/components/calendar/calendar-view.tsx`, including previous/next that refetches `GET /api/calendar` for the new range

**Checkpoint**: The month can be read without opening each day. Filtering does not change saved checks.

---

## Phase 4: User Story 3 — Choose activities and colors (P3)

**Goal**: Every existing activity is available immediately. The user can hide one and change its color, and past days follow.

**Independent Test**: Hide Tennis, set Running to another palette color, refresh. Tennis is gone, including its marks. Running's old days use the new color. Showing Tennis again restores its marks.

- [ ] T014 [US3] Accept `calendarVisible` and `calendarColor` in `Life App/src/app/api/activity-types/[id]/route.ts`, reject a color that is not a palette name, and return both fields
- [ ] T015 [P] [US3] Call `defaultCalendarColor` when an activity type is inserted, in all of these: `POST` and `seedDefaultActivityTypes` in `Life App/src/app/api/activity-types/route.ts`, `Life App/src/lib/seed-user-defaults.ts`, and `ensureActivityType` in `Life App/src/lib/garmin-sync-apply.ts`. Set `calendarVisible` true on those inserts.
- [ ] T016 [US3] Create `Life App/src/components/calendar/calendar-configure.tsx` and open it from `calendar-view.tsx` — visibility toggle, activity-icon choices from `ACTIVITY_TYPE_ICONS`, and palette swatches for every activity, including hidden ones, saved through `PATCH /api/activity-types/:id` (`calendarVisible`, `calendarColor`, `icon`)
- [ ] T017 [US3] When every activity is hidden, keep the month grid and show a prompt in `calendar-day-panel.tsx` to show at least one activity

**Checkpoint**: No setup is required for the first check. A color change repaints past days without rewriting logs.

---

## Phase 5: User Story 4 — Dashboard without a watch (P4)

**Goal**: The week card counts calendar checks, including zero, without asking for Garmin. Sleep and calories still do.

**Independent Test**: With Garmin disconnected and no running distance, check two activities this week and confirm the dashboard's large number is 2. Clear them and confirm it shows 0 with a link to `/this-week`. With a run that has distance, confirm the large number is the kilometres and the count is the smaller line. Confirm a Garmin or detailed session on the same activity and day still counts once on the dashboard and cannot be removed from the calendar.

- [ ] T018 [US4] Change `activities.thisWeek` in `Life App/src/app/api/dashboard/route.ts` to `countDistinctActivityDays` for logs from Monday through `brusselsToday()`. Derive that Monday from the Brussels date, not from `new Date()` on the server. Do not change digest totals or goal counters.
- [ ] T019 [US4] Update `ActivityCard` in `Life App/src/components/dashboard/dashboard-cards.tsx` so a disconnected account with a zero week shows `0` and a link to `/this-week`. Keep kilometres as the large number when `kmRunThisWeek` is above zero. Leave sleep and calories as they are.
- [ ] T020 [P] [US4] Set `source: "garmin"` on activity log inserts in `Life App/src/lib/garmin-sync-apply.ts`
- [ ] T021 [US4] Include `source` from `Life App/src/app/api/activities/summary/route.ts` and show "Checked" instead of "0m" for a calendar row in `Life App/src/components/activities/activities-dashboard.tsx` and in the Completed Activities line in `Life App/src/components/daily/daily-view.tsx`

**Checkpoint**: Walk steps 11–14 in `specs/006-activity-calendar/quickstart.md`.

---

## Phase 6: Polish

- [ ] T022 [P] Document the new columns in `Life App/specs/master/data-model.md` and the new routes in `Life App/specs/master/contracts/api-routes.md`
- [ ] T023 Run `quickstart.md` end to end on two users and fix any mismatch with the spec

---

## Dependencies & Execution Order

- **Phase 1** blocks every story.
- **US1** starts after Phase 1. It does not need the month grid.
- **US2** depends on US1, because the grid reads the month payload and the selected day.
- **US3** depends on US1. It can proceed in parallel with US2 after T009 exists, since configure and the grid touch different components except the shared view.
- **US4** depends on Phase 1 and on checks actually writing logs (T006). It does not depend on the month grid.
- **Polish** depends on the stories you intend to ship.

### Parallel opportunities inside US1

T007 (sidebar) and T008 (page) can be done while T005 and T006 are in progress. T010 waits on T006 and T009.

---

## Implementation Strategy

### MVP (US1, Phases 1–2)

1. T001–T004 schema and helpers
2. T005–T010 check a day
3. Stop and confirm a refresh keeps the check and does not duplicate it

### Full order

1. MVP
2. US2 month color
3. US3 configure
4. US4 dashboard and history
5. Polish and the quickstart pass

---

## Notes

- **23 tasks** across 6 phases
- Do not add a unique index on activity, date, and user. Two real sessions on one day must still save.
- Do not delete `manual` or `garmin` rows from the calendar checkbox.
- `thisWeek` will drop when someone had two logs of the same activity on the same day. That is the dashboard rule. Digest totals and goal counts still count both rows.
- The day list stays alphabetical. Checking an activity does not move it.
- A finished activity is a colored icon section, not a dot. The week shows every section. The month shows three, then a count.
- No new npm dependency.
