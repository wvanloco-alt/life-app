# Feature Specification: Habits Redesign + Today's Session Card

**Feature**: `habits-and-session-card`  
**Created**: 2026-08-13  
**Status**: Implemented  
**Branch**: `life-app-2.0`

---

## Why This Exists

Two surfaces that still carry guilt mechanics and information noise after the 2.0 dashboard work:

**Habits** — the streak counter is a guilt mechanic in disguise. A streak of 14 days resets to zero on one missed day. The 3-week calendar shows only a narrow window — you can see you missed yesterday but you can't see the 28 days you showed up before that. The app should show you how consistent you've been, not punish a single miss.

**Training schedules** — the Goals page shows the full training plan: phases, descriptions, week counts, notes. This is useful for setup but noise before a session. The user's stated need: open the app, see what to do today, close it. Currently that requires scanning the Goals page, reading a goal card, expanding the training plan section, finding the current phase. That's 4 steps too many.

---

## Design Direction

**Aesthetic target**: Quiet confidence. Both features should feel like checking a well-made notebook — not a fitness app, not a SaaS dashboard.

**Key principles applied**:
- Warm over cold: habit cells use the habit's own color. Empty cells are barely-there warm paper, not an aggressive gray.
- Typography carries meaning: the consistency metric is the hero, shown in Fraunces. The streak is quiet secondary information, not the lead.
- No guilt states anywhere: no red cells, no broken-streak UI, no "you missed X days" framing. Silence communicates neutrality.
- One clear thing: today's session shows one card per scheduled sport session. No descriptions, no phase timelines, no noise unless the user explicitly expands.

---

## Feature 1: Habits Redesign

### What changes

#### 1a. Consistency metric replaces streak as the hero number

The left block of each habit row currently shows:
```
14 d streak
best 21d
```

Replace with:
```
22 / 30
```
In Fraunces, larger. Reads as "22 of the last 30 days." No "best" comparison. No streak reset anxiety.

Keep streak as quiet secondary metadata — small, muted, below the consistency count. It's still useful context but not the lead. Remove the "best X d" comparison entirely (it creates a different kind of comparison anxiety).

#### 1b. Year heatmap toggle on each habit row

The 3-week calendar stays as the default view. It's the logging surface — you tap a day to mark it done. This is good interaction design and should not be removed.

Add a **toggle** on each habit row that switches the right-hand side between:
- **"Log"** (default): the existing 3-week interactive calendar
- **"Year"**: a full-year heatmap grid

The year view is read-only (you can't log from it — logging needs the 3-week grid). It is for reflection only: "look how consistent I've been this year."

#### Year heatmap visual design

```
Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
███  ·    ███  ███  ·    ███  ███  ███  ·    ███  ███  ···
███  ███  ███  ·    ███  ███  ·    ███  ███  ███  ···  ···
...
```

- **Grid**: 53 columns (ISO weeks) × 7 rows (Mon–Sun). Each cell is 12×12px with 2px gap.
- **Filled cell**: the habit's custom color at full opacity.
- **Empty/missed cell**: `oklch(0.93 0.005 55)` — barely warmer than the page background. Invisible at a distance. Not gray, not white, not punishing.
- **Future cells** (after today): the same empty color as missed cells — indistinguishable. Future is not empty, it just hasn't happened yet.
- **Today's cell**: a 1px ring in `foreground/20`.
- **Month labels**: 3-letter abbreviations (Jan–Dec) above the first column of each month. Plus Jakarta Sans 11px, muted. No gridlines.
- **Tooltip on hover**: date formatted as DD-MM-YYYY + "Done" or nothing (no "Not done" label).
- **Cells before habit creation date**: rendered as the empty color, non-interactive.
- **Animation on mount**: columns fade in left-to-right via stagger (CSS animation). Subtle — 20ms delay per column.

The heatmap fits the full year in approximately 700px width on desktop. It is desktop-first and does not need to work on mobile.

#### 1c. API change: extend `recentLogDates` to the last 365 days

Currently the habits API returns `recentLogDates` as the last 30 days. The window becomes the **last 365 days** (not "Jan 1 – today": in January that window would only contain a few days, silently deflating the "X / 30" consistency count, which needs the last 30 days spanning into the previous year). The heatmap filters to the current calendar year client-side. Same field name, larger payload — still trivial (~365 date strings per habit).

### What does not change

- The 3-week calendar interaction (logging, toggle, affirmation, nudge)
- Habit form (quick mode, walkthrough)
- Drag-to-reorder
- Archive / restore
- Principles section
- The habit data model

---

## Feature 2: Today's Session Card

### What it is

A new **"Today" section** at the top of the Goals page. It shows a card for each sport session scheduled for today that is linked to a goal with a training plan. It answers the single question: *what am I doing today?*

If there are no sessions today (rest day or nothing scheduled), it shows a calm rest-day state — not an empty state with a CTA.

### Layout on the Goals page

```
Today
─────────────────────────────────────────────────────
[ Running · Week 4 of 8 · Base Building        Done ]
[ Tennis  · Week 2 of 6 · Foundation & Prehab       ]
─────────────────────────────────────────────────────

Goals
─────────────────────────────────────────────────────
[ yearly goal cards ... ]
```

The "Today" section sits above the goal cards. It is permanent — always rendered, even on rest days (where it shows the rest state).

### Session card anatomy

Each session card contains exactly this, nothing more:

```
┌──────────────────────────────────────────────────────────────┐
│  🏃  Running                        Base Building  Week 4/8  │
│                                                              │
│  Training session · 60 min                                   │
│                                                              │
│  Focus: Aerobic base, easy pace, stay in Zone 2              │
│                                                        [✓]   │
└──────────────────────────────────────────────────────────────┘
```

Field by field:
- **Sport icon** — the Lucide icon for the activity type (small, 16px, activity type color)
- **Sport name** — Plus Jakarta Sans, medium weight
- **Phase name** — the current training phase name (e.g. "Base Building"). Fraunces, right-aligned alongside the sport
- **Week indicator** — "Week 4/8" in JetBrains Mono, muted, same line as phase name
- **Session type** — "Training session" or "Supplemental session", muted body text
- **Duration** — computed from the scheduled block (`endTime − startTime`; the activities table has no duration column), falling back to the activity type's default `durationMinutes`. JetBrains Mono.
- **Focus line** — a single sentence derived from the phase's `sport_focus_content` (first sentence only, 80 char max). Not the full phase description — just the essence.
- **Completion toggle** — a quiet circular check button (not a big CTA), right-aligned. If Garmin auto-completed, show as checked and read-only with a small Garmin attribution.

### Card visual design

- Background: `bg-card` with `border border-border/60`
- Border radius: `0.625rem`
- No shadow (shadows are decorative noise here)
- Completion state: checked card gets a very subtle `opacity-80` with the sport icon changing to full color. Not a dramatic color fill — quieter than that.
- Multiple cards: stacked vertically with `gap-3`. Max 3 visible (edge case: user has 4 active sports).
- Card height: fixed at `~80px` to avoid layout shift as sessions are checked off.
- The session card does NOT expand. No accordion, no "see full description" — that lives on the goal card below.

### Rest day state

When no sessions are scheduled for today (or all goals are on a rest phase):

```
┌──────────────────────────────────────────────────────────────┐
│  Rest day                                                    │
│  Recovery is training.                                       │
└──────────────────────────────────────────────────────────────┘
```

- Fraunces for "Rest day", medium size
- The sub-line is fixed copy. It doesn't change per phase or sport — it's a universal calm message.
- Muted background, same card style, same size as a normal session card.
- No CTA, no "add a session" button.

### Data source

Today's sessions come from the existing `activities` table:
- `activity_date = today` (the column is `activity_date`, not `date`)
- `goal_id IS NOT NULL` (linked to a goal)
- The goal has a training plan (`training_plans` with `goal_id`)
- `session_type = 'training' OR 'supplemental'`
- Sorted by activity type name for stable ordering

The `notes` field on each activity already contains the phase description (written there during schedule apply). The focus line is derived from the first sentence of `notes`.

The current phase name comes from `training_phases` where `status = 'active'` for the goal's training plan (column: `phase_type`; total weeks come directly from `duration_weeks`).

**Garmin attribution**: the sync marks matched sessions `is_completed = true` but stores no link to the Garmin log. `garminLinked` is therefore *inferred*: a completed session is Garmin-completed if an `activity_logs` row exists for the same user with `garmin_activity_id IS NOT NULL`, the same date, and the same activity type — the exact matching rule the sync itself uses.

**No new tables or columns needed.**

### API: `GET /api/today/sessions`

A new thin endpoint. Auth-gated. Returns:

```typescript
interface TodaySession {
  activityId: number;
  activityTypeId: number;
  activityTypeName: string;
  activityTypeIcon: string;
  goalId: number;
  sessionType: "training" | "supplemental";
  durationMinutes: number;
  isCompleted: boolean;
  garminLinked: boolean;           // inferred: completed + a Garmin-imported activity_log on the same date with the same activity type
  phaseName: string;
  phaseWeekNumber: number;         // which week within the phase (1-based)
  phaseTotalWeeks: number;         // total weeks in the phase
  focusLine: string;               // first sentence of notes, max 80 chars
}

// Response: TodaySession[] (empty array = rest day or nothing scheduled)
```

---

## User Scenarios & Testing

### User Story 1 — Consistency count (P1)

The user opens the Habits page and sees "22 / 30" as the prominent metric for each habit instead of "14 d streak." They feel the number is encouraging rather than precarious.

**Why this priority**: Directly addresses the guilt mechanic identified as a usability problem. Pure UI change with no new data needed.

**Independent test**: Can be tested by verifying the left block of each habit row shows the "X / 30" metric in Fraunces, and the streak is present but smaller and muted.

**Acceptance scenarios**:
1. **Given** a habit with 22 completions in the last 30 days, **When** the habits page loads, **Then** the left block shows "22 / 30" prominently in Fraunces font.
2. **Given** a habit where yesterday was missed, **When** the page loads, **Then** no red color, no broken-streak indicator, no punishing visual treatment appears anywhere.
3. **Given** a habit with 0 completions in 30 days, **When** the page loads, **Then** "0 / 30" is shown in the same style as any other count — no alarming color.

---

### User Story 2 — Year heatmap toggle (P2)

The user clicks a toggle on any habit row to switch from the 3-week calendar to the full-year heatmap. They can see at a glance how consistent they've been since January.

**Why this priority**: The year view is the key "trophy case" moment for habits — it shows accumulated progress. But it's secondary to the log view, which is why it's a toggle, not the default.

**Independent test**: Can be tested by toggling the view on one habit row and verifying the year heatmap renders with the correct colored cells for logged dates.

**Acceptance scenarios**:
1. **Given** the habits page is in default (Log) mode, **When** the user clicks the year toggle, **Then** the right side of the habit row switches from the 3-week calendar to the full-year heatmap.
2. **Given** the year heatmap is shown, **When** the user hovers over a filled cell, **Then** a tooltip shows the date.
3. **Given** the year heatmap is shown, **When** the user hovers over an empty cell before today, **Then** the tooltip shows only the date — no "Not done" or failure language.
4. **Given** the toggle is switched to Year for one habit, **When** the page re-renders (e.g. after a log toggle), **Then** that habit row remembers its view state.
5. **Given** the year view is active, **When** the user tries to interact with a cell, **Then** nothing happens — the year view is read-only.

---

### User Story 3 — Today's Session card (P3)

The user opens the Goals page before a workout. They immediately see "Running · Week 4/8 · Base Building" at the top, with a single focus line and a check button. They don't need to scroll or expand anything.

**Why this priority**: This is the training schedule usability fix. The goal page currently requires multiple taps to find today's session.

**Independent test**: Can be tested by verifying the Goals page shows a "Today" section above the goal cards when at least one training session is scheduled for today.

**Acceptance scenarios**:
1. **Given** a running session is scheduled for today linked to a goal with a training plan, **When** the Goals page loads, **Then** a session card appears at the top showing the sport name, phase name, week indicator, and a focus line.
2. **Given** the session card is rendered, **When** the user clicks the completion check, **Then** the card transitions to a completed state (checked icon, slight opacity reduction) and `PATCH /api/activities/:id` is called optimistically.
3. **Given** Garmin has auto-completed the session (linked log exists), **When** the Goals page loads, **Then** the card renders in the completed state and the check button is read-only with a Garmin attribution note.
4. **Given** no sessions are scheduled for today, **When** the Goals page loads, **Then** a rest-day card renders with "Rest day" and "Recovery is training." No goal CTA, no empty state.
5. **Given** two sports are scheduled for today (e.g. Running + Climbing), **When** the Goals page loads, **Then** two session cards render, one per sport, stacked vertically.

---

### Edge Cases

- Habit created this week — year heatmap shows no filled cells before creation date (cells are the empty color, not a different indicator).
- Habit with 0 logs — year heatmap is entirely empty. No error state, just the warm empty grid.
- Training plan on rest phase — the session card does not appear for that sport. If all sports are on rest, the rest-day card shows.
- Activity has no notes (edge case from manual scheduling) — the focus line is omitted; card still renders with sport + phase name.
- Multiple sessions for the same sport on the same day — show as one card per activity (both cards visible, stacked).
- Goal has a training plan but no phases generated yet — that sport does not appear in today's sessions.

---

## Requirements

### Functional Requirements

- **FR-001**: The habits API MUST return log dates for the last 365 days instead of the last 30 days (covers both the current-year heatmap and the 30-day consistency count across the January year boundary).
- **FR-002**: Each habit row MUST display a "X / 30" consistency count as the primary metric, where X = completions in the last 30 calendar days.
- **FR-003**: Each habit row MUST retain the current streak as a secondary visible metric (smaller, muted).
- **FR-004**: The "best X d" comparison display MUST be removed.
- **FR-005**: Each habit row MUST include a toggle that switches the right-hand side between the 3-week log view and the year heatmap view.
- **FR-006**: The year heatmap MUST use the habit's custom color for filled cells and a near-invisible warm neutral for empty/missed/future cells.
- **FR-007**: The year heatmap MUST be read-only — no logging interaction.
- **FR-008**: No cell in the year heatmap MUST use red or any punishing color for missed days.
- **FR-009**: A `GET /api/today/sessions` endpoint MUST return all training/supplemental sessions scheduled for today that are linked to goals with active training plans, including phase name, week indicator, and focus line.
- **FR-010**: The Goals page MUST render a "Today" section above the goal cards at all times.
- **FR-011**: Each session card MUST display: sport icon, sport name, phase name, week indicator (e.g. "Week 4/8"), session type label, duration, and focus line.
- **FR-012**: Each session card MUST include a completion toggle that calls `PATCH /api/activities/:id` optimistically.
- **FR-013**: If a session was auto-completed via Garmin, the card MUST render in completed state with the check read-only.
- **FR-014**: When no sessions are scheduled today, a rest-day card MUST render with the text "Rest day" and "Recovery is training."
- **FR-015**: The rest-day card MUST NOT include a CTA or empty-state action button.

---

## UI Design Specification

### Design token reference

All colors use existing CSS variables and `--palette-*` values from `globals.css`. No new tokens introduced.

| Use | Token |
|---|---|
| Habit cell filled | `habit.color` (per-habit, already stored) |
| Habit cell empty | `oklch(0.93 0.005 55)` (warm paper, barely-there) |
| Consistency count | `--foreground` at full opacity, Fraunces |
| Streak secondary | `--muted-foreground`, Plus Jakarta Sans 12px |
| Session card bg | `--card` |
| Session card border | `--border` at 60% opacity |
| Phase name | `--foreground`, Fraunces |
| Week indicator | `--muted-foreground`, JetBrains Mono |
| Focus line | `--muted-foreground`, Plus Jakarta Sans 13px |
| Rest day card | `--muted/30` background, no border |

### Habit row updated layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ● I am someone who runs daily     22 / 30  [Log | Year]  ░░█░░███░░█░███░░█   │
│    Morning run                      6 d streak             ░███░░░█░░███░░░░█   │
│    When I wake up, I will run                              ░░░░░░███░░░░░░░██   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

The Log/Year toggle is a 2-segment control (not tabs, not a dropdown — a compact `[Log | Year]` button pair) positioned between the left identity block and the right calendar. 11px, muted until active segment.

### Year heatmap month labeling

Labels appear above the grid aligned to the first week of each month. When two months would produce overlapping labels (e.g. Feb is only 4 weeks), the shorter month's label is still shown — the 12×12 cells with 2px gap give enough room.

### Session card completion states

**Default (not done)**:
- Border: `--border/60`
- Check button: `--muted-foreground/40`, hollow circle icon
- Text: full opacity

**Completed (user toggled)**:
- Border: `--border/30` (slightly more muted)
- Check button: filled circle, `--palette-green` or similar positive accent
- Text: `opacity-70` (recedes, it's done)
- Transition: 200ms, `ease-out-quart`

**Garmin auto-completed**:
- Same as completed
- Below the check button: a micro-label "via Garmin" in 10px muted text

---

## Success Criteria

- **SC-001**: The habit consistency metric ("X / 30") is visually larger and more prominent than the streak number on every habit row.
- **SC-002**: After switching to year view and back, the toggle remembers the last-used state for that habit row within the session (does not persist across page reloads — session state only).
- **SC-003**: A user can answer "what am I doing today?" by looking at the Goals page for under 5 seconds, without scrolling or expanding anything.
- **SC-004**: Completing a session from the Today card feels instant — the optimistic update applies before the API responds.
- **SC-005**: No red or punishing color appears anywhere in the habits UI under any condition (0 completions, missed days, empty heatmap).
- **SC-006**: `npm run build` passes with no TypeScript errors after implementation.

---

## Assumptions

1. The view-toggle state (Log vs Year) is session-only per habit row. It resets on page reload. Persisting this preference is out of scope.
2. The year heatmap covers Jan 1 – Dec 31 of the current calendar year only. Prior years are out of scope.
3. The focus line (Today's Session card) is derived from the first sentence of `activities.notes`, truncated at 80 characters. If notes is null, the focus line is omitted.
4. "Today" for the session card is determined by the **client** and sent as a `?date=YYYY-MM-DD` query param — the same decision the habits feature already made (server UTC "today" is wrong in the evening for UTC+2 users). The server validates the format and uses it as-is.
5. The API returns phases from `training_phases WHERE status = 'active'`. If multiple active phases exist for a plan (edge case from plan restarts), the most recently activated is used.
6. The week indicator ("Week X/Y") is derived from the phase's `startDate` — weeks elapsed since phase start + 1, capped at the phase's `durationWeeks` (stored on the phase — no need to derive from end date).

---

## Out of Scope

- Persisting year/log toggle preference across sessions
- Multi-year habit history
- Logging habits directly from the year heatmap
- Sharing or exporting habit data
- Training session detail expansion within the card (full phase description stays on the goal card)
- Changing the session from the Today card (that requires the goal form)
