# Scope: Habit tracking

**Feature ID:** `habit-tracking`
**Priority:** Medium. Not blocking. Real, but not urgent.
**Status:** Scoping. Confirmed product framing with user 2026-05-15.
**Last updated:** 2026-05-15

---

## Constitutional note

This feature cannot start implementation while `role-scheduling-rules-removal` and `goal-progress-sessions-fix` are still in flight. The constitution rule is "one feature at a time." This `scope.md` is permitted because scoping is in the Specify phase and does not touch code. The implementation slot for habit tracking opens once:

1. The hotfix `goal-progress-sessions-fix` ships.
2. `role-scheduling-rules-removal` ships (currently paused on open question H3, server-side `sessionsPerWeek` validation).

Both are 1 to 2 PRs ahead of this work.

---

## Problem statement

The user wants to track lightweight daily behaviors, e.g., breathing exercises, meditation, abstaining from alcohol. The current system technically supports this through tally-style goals and the "Log Progress" button, but the user experience is wrong for the job:

1. **Goal form is heavyweight.** A goal carries title, role, horizon, activity type, metric, target value, target period, target unit, sessions per week, preferred days, target date, possibly a training plan. For "did I meditate today" that is absurd. The form was calibrated for "Climb V7 this year," and habits are being squeezed through it.
2. **The schedule view is the wrong place to track habits.** Habits are ambient. They are not 9am Monday events. Putting them on the calendar forces them to compete with real scheduled activities for visual space, and the calendar is already cluttered.
3. **Identity is invisible.** The current Goals system tracks outcomes ("Climb V7", "Read 12 books"). It does not track the kind of person you are becoming, which is the central frame of Atomic Habits. The user has explicitly chosen that frame as the design lens for this feature.

The "no drinking 25 days/month" yearly goal is the clearest example. It works, technically. It feels wrong. It is a habit being squeezed through a goal-shaped form.

---

## Design lens: Atomic Habits, via the saved podcast episode

The user has explicitly named James Clear's framework, sourced from `Favorite podcasts/Productivity & Discipline/James clear .txt` (Tim Ferriss episode). The principles below are quoted or paraphrased from that source.

**Principles being baked into the product**:

1. **Systems over goals.** "You don't rise to the level of your goals, you fall to the level of your systems." Goals stay as Goals. Habits is the systems layer. Different table, different page, no cross-link.
2. **Identity-based habits.** "Every action you take is a vote for the type of person you wish to become." Every habit carries a required identity statement ("I am the type of person who..."). The identity statement is the primary visual element of each habit. The habit name is a subtitle.
3. **Two-minute rule.** "Take whatever habit you're trying to build and scale it down to something that takes two minutes or less to do." Every habit carries an optional `minimum_version` text field. Shown calmly when the user is logging a day.
4. **Reduce scope but stick to the schedule.** "Bad days matter more than good days." Streaks are tracked, but softly: current AND best. A miss does not erase history.
5. **Habit stacking.** "After I [existing habit], I will [new habit]." Every habit carries an optional `cue` text field. Encodes the "when."

**Principles intentionally left in the user's head, not the product**:

1. **Four laws of behavior change** (obvious, attractive, easy, satisfying). These are evaluation lenses, not form fields. Rendering them as four mandatory inputs per habit is anti-simplicity.
2. **Environment design.** Physical, social, digital environment is real-world; an app cannot model it. Out of scope.
3. **Annual review prompts.** Clear's "Can my current habits carry me to my desired future?" is a journaling concept, not a per-habit feature. Possible v2 feature, separate scope.
4. **Reward layering** ("favorite coffee after meditating"). User-arrangeable, not product-arrangeable.

---

## Goal

A new top-level "Habits" page where the user can:

- Create a habit by writing an identity statement, a short name, and (optionally) a cue and minimum version.
- See all active habits as a list, with identity as the primary visual element.
- Tap one day square per habit to mark it done. Tap again to un-mark.
- See current streak and best streak per habit.
- Archive habits that are no longer relevant. Reorder them by drag.

That is the entire v1 surface area.

---

## What we're building (v1)

### Schema

Two new tables. No changes to existing tables.

**`habits`**:

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | autoincrement |
| `user_id` | text, FK to users | auth scope, per constitution |
| `identity` | text, required | e.g., "I am the type of person who meditates daily" |
| `name` | text, required | short label, e.g., "Meditate" |
| `cue` | text, optional | e.g., "After morning coffee" |
| `minimum_version` | text, optional | e.g., "60 seconds counts" |
| `color` | text, required | hex or palette token, matches existing role/goal color picker |
| `display_order` | integer, default 0 | for drag-to-reorder |
| `is_archived` | boolean, default false | for archive flow |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**`habit_logs`**:

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | autoincrement |
| `user_id` | text, FK to users | auth scope |
| `habit_id` | integer, FK to habits, ON DELETE CASCADE | if the habit is deleted, its logs go with it |
| `date` | text (YYYY-MM-DD) | one row per (habit, date); presence means "done" |
| `created_at` | timestamp | |

A unique constraint on (`habit_id`, `date`) prevents accidental duplicates.

### API

| Endpoint | Purpose |
|---|---|
| `GET /api/habits` | List non-archived habits ordered by `display_order`. Returns habit rows plus, for each habit, current streak, best streak, and a flat array of dates logged in the last 14 days. |
| `GET /api/habits?archived=true` | List archived habits. |
| `POST /api/habits` | Create. Body: `{identity, name, cue?, minimum_version?, color}`. |
| `PATCH /api/habits/[id]` | Edit fields, archive, reorder. |
| `DELETE /api/habits/[id]` | Hard delete. Cascade deletes `habit_logs` rows. |
| `POST /api/habit-logs` | Body: `{habitId, date}`. Inserts the row if it does not exist. Idempotent. |
| `DELETE /api/habit-logs` | Body: `{habitId, date}`. Deletes the row. Idempotent. |

All routes scoped by `userId` from `auth()`. Same pattern as existing routes.

### UI

One new page at `/habits`, one new top-level nav entry "Habits" (icon TBD: probably `Repeat` or `CircleCheck` from Lucide).

**List view**:

- Page heading: "Habits" in Fraunces, generous spacing per design system.
- Empty state when no habits exist: short teaching block citing the identity framing, with a "Create your first habit" CTA.
- Each habit is one row:
  - **Identity statement** as the primary heading. Fraunces, comfortable size, calm. This is the design's signature element.
  - **Habit name** as small subtitle below the identity (Plus Jakarta Sans).
  - **Color dot** to the left for visual grouping.
  - **Last 14 days strip** to the right of the text: 14 small square cells, leftmost being 13 days ago, rightmost being today. Filled = done. Tap any cell to toggle.
  - **Streak readout** to the far right: "Current: 7d, Best: 23d" in Plus Jakarta Sans, small.
  - On hover of a cell, a small tooltip shows the date.
  - When a user taps a cell to mark today done, if the habit has a `minimum_version`, a small calm toast appears for 2 seconds: e.g., "60 seconds counts." Vote-for-identity affirmation.
- "+ Add habit" button at the top-right.
- Drag-to-reorder using `@dnd-kit/core`, consistent with the rest of the app.

**Create habit, two entry paths**:

The "+ Add habit" interaction has two flows. The user picks at the entry point.

- **Quick add** (modal dialog). All five fields visible at once. For users who already know what they want.
- **Walkthrough** (multi-step dialog). One concept per step. For users who want to think through the habit before committing it.

Both flows write the same record via `POST /api/habits`. No schema difference.

**Entry points**:

- **Empty state** (no habits yet): primary CTA reads "Walk me through my first habit," opens the walkthrough. A smaller secondary link reads "or skip the walkthrough" and opens the quick form.
- **Populated state** (one or more habits exist): header has a primary "+ Add habit" button that opens the quick form, and a smaller adjacent link "or walk me through it" that opens the walkthrough. Once the user has internalised the framing, the quick form is the natural default.

**Quick add form** (modal dialog):

- Identity statement (required, larger text input, placeholder "I am the type of person who...", one-line subtitle: "Start with the kind of person you are becoming. The habit is the evidence.")
- Habit name (required, short text input, subtitle: "A short label for the action that proves it.")
- Cue (optional, text input with placeholder "After I... I will...", subtitle: "Anchor the habit to something you already do every day.")
- Minimum version (optional, text input with placeholder "60 seconds counts", subtitle: "Decide now what the smallest version looks like, so you do not have to negotiate with yourself in the moment.")
- Color picker (required, defaults to a calm warm tone)
- Archive button on edit (not create)

**Walkthrough form** (multi-step dialog, one concept per step, "Back" / "Next" / "Skip" navigation):

| Step | Question | Editorial framing (sketch, not final copy) | Input |
|---|---|---|---|
| 1 | Who are you becoming? | "Habits feel different when you frame them as evidence of identity, not as items to check off. Write the kind of person you are trying to be. The habit will be the proof." | Identity (required) |
| 2 | What action reinforces it? | "Pick one small, repeatable action that votes for that identity each time you do it. Short label, no commitment to perfection yet." | Habit name (required) |
| 3 | When will you do it? | "Anchor the habit to something already in your day. The decision cost drops to zero when the trigger is automatic." | Cue (optional, with a "Skip" button) |
| 4 | What is the minimum version? | "Bad days matter more than good ones. Decide now what counts on a hard day, so you do not bargain with yourself in the moment." | Minimum version (optional, with a "Skip" button) |
| 5 | Pick a color. | (No editorial; visual choice only.) | Color (required) |
| 6 | Review and create. | Shows all answers; user can step back to edit or click "Create habit." | None |

The walkthrough does not introduce any new fields. It is purely a presentation mode for the same data model.

**Empty state copy** (Habits page when no habits exist):

A short editorial block above the primary CTA, three principles in the app's own voice. No name-drops, no source citations. Calm declarative tone. Sketch:

> **Start with who you are becoming.**
> Habits feel different when you frame them as evidence of identity, not as tasks. "I am the type of person who never misses a meditation" is a story you tell yourself with every check-in. The habit is the proof.

> **The minimum version is the real habit.**
> Most habits fail because the bar is too high. If the normal version is thirty minutes and you only have one today, do one. It still counts. The habit you maintain is more valuable than the habit you idealise.

> **Do not miss twice.**
> Single misses are noise. Two in a row is when a habit dies. The streak is not perfection. It is the discipline of returning the next day.

The block is visible only on the empty state. Once the user has created their first habit, the editorial disappears. The principles continue to live in the form subtitles, where they are encountered exactly when relevant.

**Editorial voice rules**:

- The principles are paraphrased in the app's own voice. No reference to source author, book title, or framework name. The ideas are presented as house principles, not as a citation.
- Tone: calm, declarative, second person. Editorial register, like a Notion doc, not a self-help blurb.
- No imperatives in the form of advice. State the principle; let the user draw the conclusion.
- Same writing-style rules as the rest of the repo: no em dashes, sentence-case headings, no superlatives, no wrap-up advice paragraphs.

---

## What we're keeping

All existing systems are untouched.

- Goals, Activities, Activity Types, Roles, Monthly Plan, Scheduler, Quadrants, Training Plans.
- No migration. No data move. No deprecation.
- The user's existing "no drinking 25 days/month" yearly goal stays as a goal. They can choose to create a parallel "no drinking" habit if they want both, or migrate manually by archiving the goal and creating a habit. The product does not force a choice.

---

## What we're NOT building (now)

Explicit non-changes so future maintainers understand what was deliberate.

- **Frequency targets.** No "X days per week" field on a habit. Just tracking.
- **Role linkage.** Habits are role-agnostic per user decision 2026-05-15.
- **Goal linkage.** Habits and goals are conceptually separate systems.
- **Counts per day.** Habits are binary. No "drink 8 glasses of water" with a numeric input. If counts come up, the existing goalTallies path handles it.
- **Reminders or notifications.** The app has no notification infrastructure today.
- **Habit categories or tags.** No second entity above habits.
- **Calendar integration.** Habits do not appear on the Monthly Plan view. Separate page only.
- **Quadrant assignment.** Habits are mostly Q2 by nature. No need to surface the quadrant.
- **Four-laws form fields.** Mental model only.
- **Habit stacking as a graph.** The cue is free-form text, not a foreign key to another habit.
- **Reflection / journaling prompts.** Separate v2 feature space.
- **Streak-break-recovery flow.** A miss is a miss. No "freeze tokens" or "vacation mode." If "never miss twice" interpretation becomes desirable later, see Open Questions.
- **A dedicated principles or about page.** The editorial content lives in the empty state and in the form subtitles only. A third location (e.g., `/habits/principles`) would be more surface area to maintain, and the same content reaching the user from two contextual locations is enough teaching for v1. If long-form principles writing becomes desirable later, build it then.
- **Citation or attribution of the source framework.** The principles are presented as house principles in the app's own voice. The source podcast and book exist in the user's own library; the app does not link or reference them.

---

## Decisions made

| Question | Decision |
|---|---|
| Replace tally-style goals? | **No, coexist.** Habits is additive. Existing goals stay. No migration tool. |
| Frequency target on habits? | **No.** Just track. Streak provides the feedback. |
| Show streaks? | **Yes, current and best.** Softer than current-only. A miss does not erase history. |
| Role linkage? | **No.** Habits are role-agnostic. Inspired purely by Atomic Habits. |
| Where in nav? | **New top-level entry "Habits."** Discoverable from the sidebar like every other top-level area. Accepts one more nav slot. |
| Identity prominence? | **Identity is primary.** Big Fraunces heading. Habit name is small subtitle. This is the design's signature. |
| Optional cue and minimum version fields? | **Both included.** Optional. Closest to the source material's framing. |
| Binary vs counts? | **Binary.** A day was done or not. No multi-completion. |
| Retroactive marking? | **Yes.** Tap any past day in the 14-day strip to toggle. |
| Streak definition? | **Strict consecutive days.** Single miss breaks the current streak. Best streak preserved. May reconsider "never miss twice" in v2. |
| Default day-strip window? | **14 days.** Detail view (if added later) can show more. |
| Habit deletion? | **Hard delete with cascade.** Archive is the soft option; delete is the nuclear one. Both exist. |
| Seed default habits on signup? | **No.** Habits are deeply personal. Empty state teaches the framing. |
| Reorder mechanism? | **Drag with `@dnd-kit/core`.** Consistent with the rest of the app. |
| Auth scope? | **Standard.** Every route calls `auth()`, every query is `WHERE user_id = session.user.id`. Per constitution. |
| Guidance content surface area? | **Empty state plus form subtitles.** Two locations. No dedicated principles page in v1. Confirmed 2026-05-15. |
| Creation flow modes? | **Both quick and walkthrough.** Empty state defaults to walkthrough; populated state defaults to quick with a "walk me through" link beside. Confirmed 2026-05-15. |
| Editorial voice? | **House voice, no source attribution.** Principles paraphrased in the app's own register. No reference to author, book, or framework name. Confirmed 2026-05-15. |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Two parallel systems (habits and tally-style goals) confuse the user about which to use. | Medium. The user has one existing tally-style goal today. | Low. They can use whichever they prefer per habit. | Empty-state teaching block on the Habits page names the distinction. |
| Required identity field feels heavy at creation time and discourages habit creation. | Medium. Identity statements take a few seconds to articulate. | Medium. If users skip the page because creating one habit feels like work, the feature fails. | Placeholder text is a worked example. Identity field is short, single line, not a paragraph. We can soften to optional in v2 if usage data shows friction. |
| Strict-consecutive streak definition discourages users after a single miss. | Medium. Clear specifically warns against this dynamic. | Medium. Motivation crash is the primary failure mode of habit apps. | Best streak is shown beside current. A miss does not lose history. "Never miss twice" rule is parked in Open Questions for v2 reconsideration. |
| The Habits page becomes another cluttered surface, repeating the exact problem this feature was meant to solve. | Low if v1 stays disciplined. | Medium. | Strict scope adherence. No "while we're here" additions. |
| Streak math edge cases (timezone, leap day, retroactive marking after a long gap) produce off-by-one bugs. | Medium. Date arithmetic is famously error-prone. | Low. User-visible miscounts are recoverable. | Plan phase includes a small set of unit tests for streak computation, with explicit timezone and edge-case fixtures. |
| Editorial content drifts toward self-help cliche over time as it gets edited. | Medium. House voice is harder to maintain than copied source material. | Low. Worst case is the empty state feels like a wellness app. | The spec defines the voice rules. Future edits should be evaluated against those rules, not against the user's mood that day. |
| The walkthrough flow makes habit creation feel like a serious commitment, discouraging users from logging anything they are unsure about. | Medium. Multi-step flows always feel heavier than single forms. | Medium. If users avoid the page because creating a habit feels like a vow, the feature fails. | The empty-state offers an "or skip the walkthrough" link, and the populated-state defaults to quick add. The walkthrough is a learning tool, not a gate. |

---

## Open questions (for v2 or for spec.md to resolve)

These are not blockers for v1 but should be named so we do not forget them.

- **Streak rule: strict vs "never miss twice."** v1 ships strict. If usage shows users abandoning habits after a single miss, reconsider.
- **Reflection prompt: weekly or monthly "Can my current habits carry me to my desired future?"** Clear talks about this as a meta-habit of reflection. Not in v1. Possible v2 feature.
- **Habit detail page with longer history (e.g., 90 days).** v1 shows last 14 days only. If user wants a deeper view, this is the natural extension point.
- **Bulk-import existing tally-style goals into habits.** Decided no for v1. If usage shows users wanting the migration, build a small tool later.
- **Walkthrough on every habit creation, or only the first one.** Currently both flows are available at every creation. If usage shows the walkthrough is only used once and ignored thereafter, the entry point could shrink to "first habit only." Decide in v2 after observing usage.

---

## Out of scope (deferred)

Same list as "What we're NOT building," repeated here so the deferral is unambiguous to a future maintainer reading only this section.

- Frequency targets, role linkage, goal linkage, counts per day, reminders/notifications, categories or tags, calendar integration, quadrant assignment, four-laws form fields, structured habit stacking, reflection journaling, streak-break-recovery tooling.

---

## Next steps

1. ~~Confirm scope direction.~~ Done 2026-05-15 (this doc).
2. **User reviews `scope.md`.** Push back on any decision before we move to spec.
3. Draft `spec.md`: user stories, acceptance criteria, functional requirements.
4. `plan.md`: per-area edits, verification gates, branching strategy.
5. `tasks.md`: sequential tasks with acceptance.
6. **Pause until the queue clears** (hotfix + role-scheduling-rules-removal both shipped).
7. Implement.

---

## Notes for the reviewer

- The design lens (Atomic Habits) is the user's explicit choice. The principles I extracted from the podcast file are listed verbatim or paraphrased in "Design lens" above. Push back if I misread any of them.
- The decision to make the identity statement **required** is the load-bearing UX call. If creation friction turns out to be a problem, softening it to optional is a one-line spec change. Flag now if you want it optional from day one.
- The decision to make habits **coexist** with the tally-style goal pattern is a deliberate choice not to be opinionated about what the user "should" use. The cost is some duplication; the benefit is no migration risk and no broken existing data.
- The "one feature at a time" constraint means this work waits in line. That is intentional and constitutional.
- The **editorial voice** is the second load-bearing design call after identity-as-primary. The sketched copy in the "Guidance and walkthrough" subsection is illustrative, not final. `spec.md` will lock the exact wording and acceptance criteria for it. Push back now if the voice in the sketches feels off; the spec phase locks it in.
- The choice **not to cite James Clear or Atomic Habits** anywhere in the product is deliberate per the user's instruction 2026-05-15. The source material exists in the user's own podcast library and stays there. This frees the app to feel like its own product rather than a fan implementation.
