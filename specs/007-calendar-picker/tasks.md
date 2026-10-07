# Tasks: Calendar Picker

**Input**: Design documents from `/specs/007-calendar-picker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/calendar-picker.md, quickstart.md

**Tests**: One pure-function test for the emoji allow-list, matching the project rule that pure functions are tested. No UI test suite.

**Organization**: Tasks are grouped by user story so each story can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task in the same phase)
- **[Story]**: User story from the spec (US1–US5)

## Path Conventions

Paths are from the repository root. Application code lives in `Life App/`.

---

## Phase 1: Setup

**Purpose**: The only new module. No new package.

- [ ] T001 Create the twelve celebration tokens, their characters, and `isCelebrationEmoji` in `Life App/src/lib/celebration-emojis.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Store and return the emoji before any screen work. No story starts until this phase is done.

- [ ] T002 [P] Test that `isCelebrationEmoji` accepts the twelve tokens and rejects null, `""`, and unknown strings in `Life App/src/lib/__tests__/celebration-emojis.test.ts`
- [ ] T003 [P] Add nullable `calendarCelebration` to `activityTypes` in `Life App/src/db/schema.ts`
- [ ] T004 [P] Add `calendar_celebration` to the alter list in `Life App/apply-schema.js` with no backfill UPDATE
- [ ] T005 [P] Add `calendarCelebration` on `ActivityType` and `celebration` on `CalendarActivity` in `Life App/src/types/index.ts`
- [ ] T006 Return `celebration` from GET, mapping unknown stored values to null, in `Life App/src/app/api/calendar/route.ts`
- [ ] T007 Accept `calendarCelebration` as null or a token, reject anything else with 400, and reject an `icon` that is not in `ACTIVITY_TYPE_ICONS`, in `Life App/src/app/api/activity-types/[id]/route.ts`

**Checkpoint**: An activity can store an emoji. The calendar response includes it. Existing rows are null.

---

## Phase 3: User Story 1 — Mark the day by clicking the row (Priority: P1) 🎯 MVP

**Goal**: The day list has no switch. Clicking a row marks or clears it and the row stays put.

**Independent Test**: Click Running on today, leave, and return. It is still a colored bar in the same place. Click again and it is a quiet line. A future day does not mark.

- [ ] T008 [US1] Replace each switch with a row button in `Life App/src/components/calendar/calendar-day-panel.tsx`: quiet when clear, white icon and white name on the activity color when marked, disabled in the future, not a button when locked, and Enter or Space does nothing on those two
- [ ] T009 [P] [US1] Remove the old celebration keyframes and classes (`calendar-sweep`, `calendar-rise`, `calendar-bloom`, `calendar-ring`, `calendar-settle`, `calendar-glow`, `calendar-lift`, `calendar-ripple`, `calendar-ink`) from `Life App/src/app/globals.css`

**Checkpoint**: This Week and Month record a day with no switch and no motion celebration. The name is readable on a yellow bar and on a red bar.

---

## Phase 4: User Story 2 — Choose icon, color, and emoji one at a time (Priority: P2)

**Goal**: Configure shows one icon, one color, and one emoji. Clicking one opens only that set.

**Independent Test**: Open Configure. No full grids are visible. Open Running's colors, then its icons, and confirm the colors close. Pick a smile for Climbing and see it in the slot.

- [ ] T010 [US2] Rebuild each shown row to one icon, one color dot, and one emoji slot, with a single open chooser, in `Life App/src/components/calendar/calendar-configure.tsx`
- [ ] T011 [P] [US2] Extend the activity patch to send `calendarCelebration` and reload the calendar in `Life App/src/components/calendar/calendar-view.tsx`

**Checkpoint**: Icon, color, and emoji save, and past days use the new icon and color.

---

## Phase 5: User Story 3 — Celebrate a check with the chosen emoji (Priority: P2)

**Goal**: A successful mark plays the activity's emoji once. An empty emoji plays nothing. Clearing plays nothing.

**Independent Test**: Mark Climbing with no emoji and see nothing extra. Set a smile, mark it, and see the smile once. Clear the row and see no second smile.

- [ ] T012 [US3] Play the celebration character once after a successful mark, remove it if the save fails, and remove it immediately when the row is cleared, in `Life App/src/components/calendar/calendar-day-panel.tsx`
- [ ] T013 [P] [US3] Add the `calendar-emoji` rise-and-fade animation in `Life App/src/app/globals.css`, with a fade-only rule under `prefers-reduced-motion` that is not `animation: none`

**Checkpoint**: Only a chosen emoji celebrates, and the old motions stay gone.

---

## Phase 6: User Story 4 — Hide an activity without a switch (Priority: P3)

**Goal**: Hide and Show are words. Hidden activities sit under Hidden and leave the day list.

**Independent Test**: Hide Tennis, confirm it is absent from the day and listed under Hidden, then Show it and confirm its old marks return.

- [ ] T014 [US4] Split Configure into shown rows with Hide and an alphabetical Hidden group with Show, and omit the Hidden heading when nothing is hidden, in `Life App/src/components/calendar/calendar-configure.tsx`

**Checkpoint**: The day list only shows activities that are not hidden. No switch remains in Configure.

---

## Phase 7: User Story 5 — Add an activity from Configure (Priority: P3)

**Goal**: A name typed in Configure creates a normal activity. A duplicate name is refused. There is no delete control.

**Independent Test**: Add "French", see it on today's list, then try "french" and see the already-used message with still one French.

- [ ] T015 [P] [US5] Store the trimmed name, reject a duplicate case-insensitive name with 409, and force `calendarCelebration` null even if the body sends one, in `Life App/src/app/api/activity-types/route.ts`
- [ ] T016 [US5] Post `{ name }` and reload the calendar from `Life App/src/components/calendar/calendar-view.tsx`
- [ ] T017 [US5] Add the name field and save button, and show the 409 message, in `Life App/src/components/calendar/calendar-configure.tsx`

**Checkpoint**: A new activity appears on the day list and in Settings, with no emoji until one is chosen.

---

## Phase 8: Polish

**Purpose**: Confirm the stories together.

- [ ] T018 Walk through `specs/007-calendar-picker/quickstart.md` on This Week and on Month, and fix any miss before calling the feature done

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on T001 and blocks every user story.
- User stories start after Phase 2, in the order below.
- Polish depends on the stories you intend to ship. The MVP can stop after Phase 3 and still run the day-list steps in the quickstart.

### User Story Dependencies

- **US1 (P1)**: After Phase 2. No other story. T008 and T009 touch different files.
- **US2 (P2)**: After Phase 2. Uses the patch from T007. Does not require US1.
- **US3 (P2)**: After US1, because both edit `calendar-day-panel.tsx`. Needs `celebration` from T006.
- **US4 (P3)**: After US2, because both edit `calendar-configure.tsx`.
- **US5 (P3)**: After US4, because the name field is added to the Configure screen US4 just structured. T015 can be written as soon as Phase 2 is done.

### Parallel Opportunities

- T002, T003, T004, and T005 can run together after T001.
- T006 and T007 can run together after T003 and T005.
- T008 and T009 can run together.
- T010 and T011 can run together.
- T012 and T013 can run together.
- T015 can run beside US1–US4. T016 and T017 stay after US4.

### Parallel Example: Foundational

```text
T002  Life App/src/lib/__tests__/celebration-emojis.test.ts
T003  Life App/src/db/schema.ts
T004  Life App/apply-schema.js
T005  Life App/src/types/index.ts
```

### Parallel Example: User Story 1

```text
T008  Life App/src/components/calendar/calendar-day-panel.tsx
T009  Life App/src/app/globals.css
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Finish Phase 1 and Phase 2.
2. Finish Phase 3.
3. Stop and check the day list: no switch, row stays put, future days stay locked, Garmin rows stay locked.

### Incremental Delivery

1. Foundation, then the day list (US1).
2. Configure's three choosers (US2).
3. Emoji playback (US3).
4. Hide and Show (US4).
5. Add by name (US5).
6. Walk the quickstart.

US2 before US3 is the useful order even though US3 is also P2: there is no on-screen way to pick an emoji until US2.

---

## Notes

- Do not seed suggested emojis. Null is the starting value.
- Do not edit the week grid, the month grid, the legend, or `PUT /api/calendar/check`.
- Do not add a delete control to Configure.
- Commit after each phase if you are committing as you go.
