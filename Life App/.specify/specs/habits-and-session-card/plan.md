# Implementation Plan: Habits Redesign + Today's Session Card

**Feature**: `habits-and-session-card`  
**Created**: 2026-08-13  
**Branch**: `life-app-2.0`  
**Spec**: `.specify/specs/habits-and-session-card/spec.md`

---

## Technical Context

### What already exists

| Asset | Location | Reuse / Change |
|---|---|---|
| `HabitRow` component | `src/components/habits/habit-row.tsx` | Modify: swap streak hero for consistency count, add view toggle |
| `HabitCalendar` (3-week) | `src/components/habits/habit-calendar.tsx` | Keep unchanged — still the log view |
| `computeStreaks` | `src/lib/habit-streaks.ts` | Keep — streak is still shown as secondary |
| `GET /api/habits` | `src/app/api/habits/route.ts` | Modify: return last-365-days log dates instead of last 30 days |
| `activities` table | `src/db/schema.ts` | Read: `activityDate`, `goalId`, `sessionType`, `notes`, `isCompleted`, `activityTypeId`, `startTime`, `endTime` — there is **no** `durationMinutes` or `linkedLogId` column |
| `activity_logs` table | `src/db/schema.ts` | Read: `garmin_activity_id` — used to *infer* Garmin completion (no link column exists on activities) |
| `trainingPlans` + `trainingPhases` | `src/db/schema.ts` | Read: `status`, `startDate`, `phaseType`, `durationWeeks`, `sportFocusContent` / `description` |
| `Goals` page | `src/app/goals/page.tsx` → `src/components/goals/goals-page.tsx` | Add "Today" section at the top |

### What is new

| Asset | Location | Purpose |
|---|---|---|
| `HabitYearHeatmap` component | `src/components/habits/habit-year-heatmap.tsx` | Full-year read-only grid |
| `TodaySessionsSection` component | `src/components/goals/today-sessions-section.tsx` | "Today" section + session cards |
| `TodaySessionCard` component | `src/components/goals/today-session-card.tsx` | Single session card |
| `GET /api/today/sessions` | `src/app/api/today/sessions/route.ts` | Returns today's training sessions with phase context |

**Schema changes: none.**

---

## Architecture

### Habits data flow change

```
GET /api/habits
  → currently returns: recentLogDates (last 30 days)
  → change to:         recentLogDates (last 365 days)
     NOT "Jan 1 – today": in January that window holds only a few days,
     silently deflating the 30-day consistency count (which spans into
     the previous December). One window covers both consumers.

HabitRow
  ├─ consistency count: logDates.filter(d => within last 30 days).length
  ├─ streak: computeStreaks(logDates, today).current  (unchanged)
  ├─ viewMode: "log" | "year"  (useState, per row, session-only)
  ├─ [Log | Year] toggle → sets viewMode
  ├─ viewMode === "log"  → <HabitCalendar>   (existing, unchanged)
  └─ viewMode === "year" → <HabitYearHeatmap logDates={logDates} />
       (heatmap filters to the current calendar year internally)
```

The only API change is replacing the 30-day window with a 365-day window. The `recentLogDates` field name stays — renaming would touch every consumer for no benefit. The stale comment in the route ("capped at 30 days per spec FR-005") must be updated to reference this spec.

### Today's Session data flow

```
GET /api/today/sessions
  ← JOIN activities + goals + training_plans + training_phases + activity_types
  ← WHERE activities.activity_date = ?date (client-provided) AND goals have active training plans
  → TodaySession[]

TodaySessionsSection (in goals-page.tsx, above goal cards)
  ├─ fetch on mount
  ├─ if sessions.length === 0 → <RestDayCard />
  └─ sessions.map(s => <TodaySessionCard session={s} onComplete={handleComplete} />)

TodaySessionCard
  ├─ renders session fields (sport, phase, week, focus, duration)
  ├─ completion toggle → PATCH /api/activities/:id { isCompleted: true/false }
  └─ optimistic: flips completed state immediately, reverts on error
```

### `HabitYearHeatmap` implementation

- Build a 53-column × 7-row grid covering the full year
- Start from Monday of the week containing Jan 1
- End at the last cell (may extend into Jan of next year — render as future cells)
- Each cell is a 12×12px `div` with `border-radius: 3px`
- Filled cells: `backgroundColor: habit.color`
- Empty cells: `backgroundColor: oklch(0.93 0.005 55)` (hardcode as CSS value, not a class)
- Today: `outline: 1px solid currentColor; outline-offset: 1px; opacity: 0.3`
- Cells before habit creation date: same as empty
- Future cells: same as empty
- Month labels: absolute/relative positioned above the grid, derived from the first column of each month
- Stagger animation: `animation-delay: calc(var(--col-index) * 8ms)` on each column, fade-in from 0 opacity
- Tooltip: shadcn `<Tooltip>` showing the date string, only on past cells
- The component receives: `yearLogDates: string[]`, `habitColor: string`, `habitCreatedAt: string`, `today: string`

### `GET /api/today/sessions` query

The route takes `?date=YYYY-MM-DD` from the client (validated by regex) — the client determines "today", same as the habits feature (server UTC would roll the date wrong in the evening for UTC+2 users).

```sql
SELECT
  a.id,
  a.activity_type_id,
  at.name AS activity_type_name,
  at.icon AS activity_type_icon,
  a.goal_id,
  a.session_type,
  a.start_time,
  a.end_time,
  a.is_completed,
  a.notes,
  tp.id AS training_plan_id,
  tph.phase_type,
  tph.start_date AS phase_start_date,
  tph.duration_weeks
FROM activities a
JOIN goals g ON a.goal_id = g.id AND g.user_id = ?
JOIN training_plans tp ON tp.goal_id = g.id
JOIN training_phases tph ON tph.training_plan_id = tp.id AND tph.status = 'active'
JOIN activity_types at ON a.activity_type_id = at.id
WHERE a.activity_date = ? -- client-provided date
  AND a.user_id = ?
  AND a.session_type IN ('training', 'supplemental')
ORDER BY at.name ASC
```

Derived fields, computed server-side:

- `phaseWeekNumber` = `Math.floor(daysBetween(phase.startDate, date) / 7) + 1`, clamped to `[1, durationWeeks]`
- `phaseTotalWeeks` = `tph.duration_weeks` (stored on the phase — no date arithmetic needed)
- `durationMinutes` = minutes between `a.start_time` and `a.end_time` (activities has no duration column), falling back to the activity type's default `duration_minutes` if the times are missing/equal
- `focusLine` = first sentence of `a.notes`, truncated at 80 chars; `null` if notes is null (card omits the line)
- `garminLinked` = **inferred**: `a.is_completed` AND an `activity_logs` row exists for this user with `garmin_activity_id IS NOT NULL`, `date = a.activity_date`, and the same `activity_type_id` — the same matching rule `garmin-sync.ts` uses to auto-complete. One extra query for the day's Garmin log types, checked in memory.
- `phaseName` = `getPhaseDisplayName(tph.phase_type)` from `src/lib/training/periodization.ts` (takes a single argument), called server-side.

---

## Component Design Details

### `[Log | Year]` toggle

```tsx
<div className="flex rounded-md border border-border/40 text-[11px] overflow-hidden">
  <button
    className={cn("px-2.5 py-1", viewMode === "log" ? "bg-muted text-foreground" : "text-muted-foreground")}
    onClick={() => setViewMode("log")}
  >
    Log
  </button>
  <button
    className={cn("px-2.5 py-1", viewMode === "year" ? "bg-muted text-foreground" : "text-muted-foreground")}
    onClick={() => setViewMode("year")}
  >
    Year
  </button>
</div>
```

Inline with the row, positioned in the gap between the identity block and the calendar. On the same line as the consistency count, right-aligned within the left block.

### Consistency count in left block

Replace the current streak block:
```tsx
// REMOVE:
<p className="text-sm font-mono font-semibold tabular-nums ...">{currentStreak}<span> d streak</span></p>
<p className="text-xs text-muted-foreground/60">best {bestStreak}d</p>

// ADD:
<p className="font-display text-2xl font-semibold tabular-nums leading-none">
  {doneLast30} <span className="text-base font-normal text-muted-foreground">/ 30</span>
</p>
<p className="text-[11px] text-muted-foreground/50 mt-1 font-sans">
  {currentStreak > 0 ? `${currentStreak}d streak` : ""}
</p>
```

### `TodaySessionCard` states

Three states managed by `isCompleted` boolean in local state (optimistic):

1. **Default**: full opacity, hollow check button `○`
2. **Completed**: `opacity-75`, filled check `✓` in `--palette-green`
3. **Garmin auto**: same as completed + "via Garmin" micro-label

Transition on completion: `transition-opacity duration-200 ease-out`.

---

## Constitution Check

| Constraint | Status |
|---|---|
| No new tables | ✅ Zero schema changes |
| Auth on every route | ✅ `auth()` called first in today/sessions route |
| User scoping | ✅ `WHERE user_id = session.user.id` on all queries |
| Local state only | ✅ `useState` per component, no global state |
| No guilt mechanics | ✅ No red cells, no broken streak visual, no "failure" framing |
| Simplicity | ✅ One new endpoint, two new components, modifications to two existing |
| Positive framing | ✅ Consistency count > streak hero, rest day is calm not empty |
