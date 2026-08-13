# Tasks: Habits Redesign + Today's Session Card

**Feature**: `habits-and-session-card`  
**Branch**: `life-app-2.0`  
**Plan**: `.specify/specs/habits-and-session-card/plan.md`  
**Total tasks**: 14  
**Status**: Implemented (2026-08-13)

---

## Dependency Order

```
Phase 1: Habits API (foundation for habit UI changes)
  └─ Phase 2: Habit row metric + toggle (US1 + US2)
       └─ Phase 3: Year heatmap component (US2)

Phase 4: Today's Session API (independent from habits)
  └─ Phase 5: Session card components (US3)

Phase 6: Polish (depends on all above)
```

Phases 1–3 (habits) and Phases 4–5 (session card) are fully independent and can be worked in parallel.

---

## Phase 1 — Habits API Update

> Extend the API to return full-year log dates. No UI change yet — the existing 3-week calendar still works unchanged with a larger date array.

- [x] T001 Modify `src/app/api/habits/route.ts`: change the `habit_logs` query window from "last 30 days" to "last 365 days" — `gte(habitLogs.date, sql\`date('now', '-365 days')\`)`. NOT "Jan 1 – today": in January that window would deflate the 30-day consistency count, which spans into the previous December. The field name `recentLogDates` stays (renaming would touch every consumer). Update the stale code comment above the query ("capped at 30 days per spec FR-005") to reference this spec. Verify the existing `HabitCalendar` still works correctly — it filters to the 3 relevant weeks client-side using `recentLogDates`, so a larger array is backward compatible.

---

## Phase 2 — Habit Row: Consistency Metric + View Toggle

> US1 + US2 entry point. The "X / 30" count and the [Log | Year] toggle are added to `HabitRow`.

- [x] T002 [US1] Modify `src/components/habits/habit-row.tsx`: replace the streak hero block with the consistency count. Add `const doneLast30 = logDates.filter(d => d >= thirtyDaysAgo && d <= today).length` (compute `thirtyDaysAgo` with date-fns `subDays`). Replace the current streak JSX block with: Fraunces `text-2xl font-semibold` showing `{doneLast30} / 30`, and below it a muted `text-[11px]` streak line showing `{currentStreak}d streak` only when `currentStreak > 0`. Remove the `best {bestStreak}d` line entirely.

- [x] T003 [US2] Add view toggle to `src/components/habits/habit-row.tsx`: add `const [viewMode, setViewMode] = useState<"log" | "year">("log")` to the component. Render a `[Log | Year]` 2-segment button control (inline, `text-[11px]`, `border border-border/40 rounded-md overflow-hidden`) between the left identity block and the right calendar area. When `viewMode === "log"`, render the existing `<HabitCalendar>` unchanged. When `viewMode === "year"`, render `<HabitYearHeatmap logDates={logDates} habitColor={habit.color} habitCreatedAt={habit.createdAt} today={today} />` (component built in T004). Place the toggle above the right panel so it doesn't disrupt the row's vertical alignment.

---

## Phase 3 — Year Heatmap Component

> The new read-only calendar grid. Depends on T003 which calls it.

- [x] T004 [US2] Create `src/components/habits/habit-year-heatmap.tsx`. Props: `logDates: string[]`, `habitColor: string`, `habitCreatedAt: string`, `today: string`. Build a 53 × 7 grid (weeks × days Mon–Sun) covering the full current year. Start from the Monday of the ISO week containing Jan 1 of the current year. For each cell: compute the ISO date string; classify as `filled` (in `logSet`), `future` (after today), `beforeCreation` (before `habitCreatedAt`), or `empty`. Render each cell as a `12×12px div` with `borderRadius: 3px`. Filled: `backgroundColor: habitColor`. All others: `backgroundColor: "oklch(0.93 0.005 55)"`. Today's cell: add `outline: "1px solid rgba(0,0,0,0.2)"` and `outlineOffset: "1px"`. Month labels: render abbreviated month names (Jan, Feb, …) above the first column of each month using absolute/relative positioning. Wrap each past cell (not future, not before creation) in a shadcn `<Tooltip>` showing the `DD-MM-YYYY` formatted date. Add column stagger animation: each of the 53 column `div`s gets `style={{ animationDelay: \`${colIndex * 8}ms\` }}` with a simple `fade-in` CSS animation class. The component is read-only — no click handlers on cells.

---

## Phase 4 — Today's Sessions API

> Independent from habits work. Can start immediately in parallel with Phases 1–3.

- [x] T005 Create `src/app/api/today/sessions/route.ts`. Auth-gate first. Read `?date=YYYY-MM-DD` from the query string (validate with `/^\d{4}-\d{2}-\d{2}$/`, 400 if invalid or missing) — the client determines "today", same as the habits feature; do NOT compute it server-side in UTC. Query: join `activities` (where `activityDate = date`, `user_id = userId`, `session_type IN ('training', 'supplemental')`) with `goals` (on `goal_id`), `training_plans` (on `goal_id`), `training_phases` (on `training_plan_id` where `status = 'active'`, take the most recently updated if multiple), and `activity_types` (on `activity_type_id`). For each result, compute: `phaseName` using `getPhaseDisplayName(phase.phaseType)` from `src/lib/training/periodization.ts` (single argument); `phaseWeekNumber` as `Math.floor(daysBetween(phase.startDate, date) / 7) + 1` clamped to `[1, phase.durationWeeks]`; `phaseTotalWeeks` as `phase.durationWeeks` (stored — no date arithmetic); `durationMinutes` as minutes between `startTime` and `endTime`, falling back to the activity type's default `durationMinutes` if missing; `focusLine` as first sentence of `activity.notes` truncated at 80 chars (`null` if notes is null); `garminLinked` **inferred** — fetch the user's `activity_logs` for `date` where `garmin_activity_id IS NOT NULL`, and set true when the session `isCompleted` and a Garmin log with the same `activity_type_id` exists (there is no link column on activities — this mirrors the matching rule in `garmin-sync.ts`). Return `TodaySession[]`. Add the `TodaySession` interface to `src/types/index.ts`.

---

## Phase 5 — Session Card Components

> Depends on T005. Build the two components and wire into the Goals page.

- [x] T006 [US3] Create `src/components/goals/today-session-card.tsx`. Props: `session: TodaySession`, `onComplete: (id: number, done: boolean) => void`. Maintain `isCompleted` in local state (initialized from `session.isCompleted`). Render: left side — activity type icon (`<LucideIcon name={session.activityTypeIcon} size={16} />`) + sport name in Plus Jakarta Sans medium; right side — phase name in Fraunces + week indicator "Week X/Y" in JetBrains Mono muted. Below: session type label (muted) + duration in JetBrains Mono. Focus line if not null (muted, Plus Jakarta Sans 13px, truncated). Check button (right-aligned): hollow circle when not done, filled green circle when done; if `session.garminLinked` and completed, render as read-only with a "via Garmin" micro-label in 10px muted text. On click: call `onComplete(session.activityId, !isCompleted)` — optimistic state flip. Three visual states per design spec (default, completed, garmin-auto). Card: `border border-border/60 rounded-[0.625rem] px-4 py-3 bg-card`.

- [x] T007 [US3] Create `src/components/goals/rest-day-card.tsx`. A static card with no props. Renders: "Rest day" in Fraunces medium, "Recovery is training." in muted Plus Jakarta Sans below. Background: `bg-muted/30`, no border. Same height as a session card (`py-3`). No interactive elements.

- [x] T008 [US3] Create `src/components/goals/today-sessions-section.tsx`. On mount: fetch `GET /api/today/sessions?date=${format(new Date(), "yyyy-MM-dd")}` — the client computes today (local time), the server does not. Show a loading skeleton (2 gray pill rows) while fetching. `handleComplete(id, done)`: optimistic — update local `sessions` state, then call `PATCH /api/activities/${id}` with `{ isCompleted: done }`, revert on error. Render: section heading "Today" in Fraunces `text-lg` with today's date ("Thursday, 13 Aug") in muted Plus Jakarta Sans below it. Then: if `sessions.length === 0` render `<RestDayCard />`, else `sessions.map(s => <TodaySessionCard key={s.activityId} session={s} onComplete={handleComplete} />)` wrapped in a `space-y-3` div.

- [x] T009 [US3] Add `<TodaySessionsSection />` to the Goals page: `src/components/goals/goals-page.tsx` (verified — there is no `goals-view.tsx`). Add it immediately above the goal cards section with `mb-8` bottom margin. Verify it renders correctly when the Goals page loads.

---

## Phase 6 — Polish & Verification

- [x] T010 Verify the `[Log | Year]` toggle does not break the existing habit row layout. Check that the row height does not change when toggling (both views should occupy the same vertical space). If the year heatmap is taller or shorter than the 3-week calendar, adjust the heatmap cell size or row spacing to match. *(Heatmap uses `min-h-[168px]` to match calendar height.)*

- [x] T011 Verify no red or punishing color appears anywhere in the habits UI: load the habits page with a habit that has 0 completions this year, check the heatmap, check the consistency count. Add a lint/grep check: run `rg "text-red|bg-red|text-destructive" src/components/habits/` and confirm any results are not reachable from habit-row, habit-calendar, or habit-year-heatmap. *(No red in calendar/heatmap; `text-destructive` only on API errors and delete menu items.)*

- [x] T012 Add a loading skeleton to `TodaySessionsSection` (T008): while fetching, render 2 skeleton cards matching the height of a real session card. Use the existing `<Skeleton>` component.

- [x] T013 Update `src/types/index.ts`: add the `TodaySession` interface (if not already added in T005). Verify `HabitWithRecentLogs` type still matches the new API response shape (field name unchanged, but now contains a larger date array — should be fine since it's `string[]`).

- [x] T014 Run `npm run build` and fix any TypeScript errors. Run `npm run test:run` and confirm existing habit streak tests still pass (the `computeStreaks` function is unchanged).

---

## Parallel Execution Map

These groups can run in parallel once their prerequisites are met:

| Track A (habits) | Track B (session card) |
|---|---|
| T001 — API | T005 — API |
| T002 — consistency metric | ↓ |
| T003 — view toggle | T006 — session card component |
| T004 — year heatmap | T007 — rest day card |
| ↓ | T008 — section component |
| T010, T011 | T009 — wire into goals page |
| T013, T014 | T012, T013, T014 |

---

## Definition of Done

- [x] "X / 30" consistency count shown prominently on every habit row (Fraunces, large)
- [x] Streak shown as small secondary text; "best X d" removed
- [x] `[Log | Year]` toggle visible on each habit row
- [x] Year heatmap renders filled cells in habit color; empty cells are warm neutral; no red anywhere
- [x] Year heatmap is read-only; 3-week log view still fully interactive
- [x] `GET /api/today/sessions` returns correct data for today's training sessions
- [x] Goals page shows "Today" section above goal cards at all times
- [x] Session card shows sport, phase, week indicator, focus line, completion toggle
- [x] Rest-day card shows when no sessions are scheduled
- [x] Garmin auto-completed sessions show as completed with "via Garmin" label
- [x] `npm run build` passes — no TypeScript errors
- [x] Existing habit tests pass
