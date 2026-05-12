# Review: Training vs. Supplemental Session Split

**Feature ID**: `training-supplemental-split`
**Reviewer role**: review agent only (no edits to `scope.md` or `spec.md`)
**Review date**: 2026-05-11
**Status**: Decisions resolved with the user. This document captures the gaps found in the original docs and the agreed-on resolutions. Hand to the developer to apply the deltas to `scope.md` and `spec.md` before moving to `plan.md`.

---

## Summary

The scope and spec are well-shaped and disciplined about what's out of scope. Seven substantive issues surfaced during review, all resolved with the user on 2026-05-11. The most important: the feature's stated value (notes that change based on what the user is supposed to do) was buried at P2 and had no defined data shape. Both are now fixed.

This review does not edit the original docs. The developer should treat sections 4 and 5 below as a checklist for the actual edits.

---

## What's strong (keep)

- The "we cannot automate the ratio from source material" finding is well-justified by a subagent investigation of the climbing, tennis, and running material. The conclusion (user-configurable with sensible defaults) follows cleanly from the finding.
- Out-of-scope discipline is explicit and correct: no color picker, no per-phase overrides, no sport-specific defaults, no analytics rework, no activity-type split.
- Acceptance scenarios are observable and testable.
- The decision to keep activity type as the sport (Climbing/Tennis/Running) so logging counts toward the goal — this avoids cascading changes through goal progress, tallies, and charts. Correct call.

None of the above needs to change.

---

## Issues found and resolutions

### Issue 1 — FR-007 has no defined data shape

**Finding**: `spec.md` FR-007 says training sessions get "sport focus + mental game" notes and supplemental sessions get "supplemental content" notes. But the current `training_phases` schema (`src/db/schema.ts:349-364`) only stores a single `description` text field. The scheduler dumps the whole thing into notes (`src/lib/scheduler.ts:758-766`). Without a data-shape decision, FR-007 was the kind of requirement that looks small in a spec and explodes in implementation.

**Resolution**: Add three text columns to `training_phases`:

```
sportFocusContent     TEXT  -- climbing focus / on-court / running focus
supplementalContent   TEXT  -- gym / antagonist / strength work
mentalGameContent     TEXT  -- mental game, mindset
```

Keep `description` as a fallback for legacy rows and goals without a training plan.

**Why three plain columns, not JSON or a separate table**:
- The codebase uses plain text columns liberally.
- Drizzle + better-sqlite3 type inference on plain columns is clean. JSON would require keeping the TypeScript shape and column in sync by hand.
- There are exactly three known layers. JSON is for variable shapes.
- `apply-schema.js` handles `ALTER TABLE ADD COLUMN IF NOT EXISTS` deterministically.

**Implications for implementation**:
- The periodization-model code that seeds phases must emit three strings instead of one.
- Climbing source markdown needs to be restructured into the three layers (V1 scope — see Issue 7).
- Migration: backfill `sportFocusContent = description` for legacy rows. `supplementalContent` and `mentalGameContent` start empty.
- For sports that haven't had their content restructured yet (tennis, running in V1), the scheduler falls back to `description`.

---

### Issue 2 — Real value buried at P2

**Finding**: The problem statement is "a wall of text that doesn't change based on what the user is supposed to do that day." Story 3 (visual distinction) was P1; Story 4 (filtered notes) was P2. You could ship Stories 1–3 without 4 and the user would still see a wall of text on every supplemental session — a half-feature that looks finished.

**Resolution**: Promote **Story 4 — Session-Type-Aware Notes** to **P1**. Filtered notes are part of V1.

---

### Issue 3 — Cycle restart wiping the user's deliberate choice

**Finding**: Story 6 said cycle restart resets the split to the default formula. The justification was "consistent with existing cycle restart." But existing cycle restart resets *phase progress* — that follows from the periodization model starting from week 1. The user's training/supplemental ratio is a personal preference about their schedule, not phase progress.

**Resolution**: **Cycle restart preserves the split.** Easiest to build (zero new code paths, no decision modal, no flag). Story 6 is deleted from the spec. Replaced with a single line under "Edge Cases" stating that cycle restart resets phase progress only and the split is preserved as a deliberate user preference.

This is also consistent with the user's broader principle (Issue 6): deliberate choices persist even when life intervenes.

---

### Issue 4 — Default formula contradicts the source material the doc itself cites

**Finding**: The formula `supplemental = min(2, max(0, sessionsPerWeek − 2))` produces 2+0 at sessionsPerWeek=2. But the scope doc cites climbing material that says antagonist work is non-negotiable at ≥2×/week. The default at 2 violates the source the doc cites for justification.

**Resolution**: **Keep the formula** — the user's "if I only have 2 sessions, I want both on the wall" argument is a real human consideration. Add a non-blocking hint in the training-plan creation dialog. Recommended copy:

> *"The source material recommends supplemental work alongside training. If your schedule allows more than 2 sessions per week, the default will add supplemental sessions automatically."*

This respects the human reality without lying about what the source says.

---

### Issue 5 — Distribution logic was hand-waved

**Finding**: FR-006 said the scheduler tags sessions "as best the distribution logic allows." SC-002 demanded "exactly 8 training and 4 supplemental." Those two requirements could conflict (e.g., when a preferred day is blacked out). The doc didn't specify how training vs supplemental days get assigned.

**Resolution**: **Dual preferred-days model.** Each training plan stores two sets of preferred weekdays:

```
trainingPreferredDays      e.g., Mon, Wed
supplementalPreferredDays  e.g., Fri
```

**Behavior**:
- Scheduler places training sessions first on `trainingPreferredDays`.
- Then places supplemental sessions on `supplementalPreferredDays`.
- If a preferred day is blacked out (existing scheduler-blackout-dates behavior), the session is skipped for that week — by type.
- If a day appears in both sets, training takes priority.
- If fewer preferred days are configured than sessions per week, the scheduler falls back to "any available day" (existing behavior, unchanged).

**Spec implications**:
- FR-006 rewritten to specify "honors separate preferred-day sets for training and supplemental sessions."
- New FR-013: training plan stores `trainingPreferredDays` and `supplementalPreferredDays` as separate fields. UI lets the user set both.
- SC-002 gets a parenthetical: *"assuming no blackouts and sufficient preferred days are configured."*

This also gives users a meaningful weekly rhythm (climb Tues/Thu, gym Sat) instead of opaque algorithmic placement.

---

### Issue 6 — `sessionsPerWeek` change on goal after plan exists

**Finding**: Edge case said scheduler "falls back to the new default formula" but the *stored* split stays. Window where saved values disagree with generated schedule.

**Resolution**: **Accepted as-is.** The user's principle: "you should be able to deviate from the plan if you want, and an injury (or life event) doesn't mean the plan should change." The saved split is preserved. The scheduler can fall back to the default for that week. When the user opens the training-plan dialog, show a **non-blocking warning** that the split doesn't match the goal's current sessions/week, with an option to reconcile. No forced modal.

---

### Issue 7 — V1 scope: climbing only or all three sports

**Finding**: Scope doc said "climbing prioritized in implementation order." Spec implied all three sports get the feature in V1.

**Resolution**: **Climbing only in V1.** Tennis V1.1, running V1.2. Same code, sport-by-sport content rollout. The schema work (the three new content columns) lands in V1; only climbing content gets restructured. Tennis and running keep the existing `description` fallback until their content rollout.

This is "underdo the competition" applied correctly — most of the implementation risk is in restructuring sport-specific content, not in the feature itself. Decoupling them lets you ship.

---

## Supplemental design tokens (Issue from review point 7 — visual treatment)

The original FR-010 said "muted card styling + 'Supplemental' badge. No new color system." That was underspecified — an implementer would have improvised.

Concrete specification, grounded in the Life App design system (warm OKLCH amber neutrals, no cool grays, calm over stimulation):

**Card styling**:

| Property | Training (unchanged) | Supplemental |
|---|---|---|
| Background | `bg-card` | `bg-muted/50` |
| Border | `border-border` | `border-border` *(same — keep the shape consistent)* |
| Title weight | `font-medium` | `font-medium` *(same — don't reduce contrast on real work)* |
| Title color | `text-foreground` | `text-foreground` *(same)* |
| Meta / time | `text-muted-foreground` | `text-muted-foreground` *(same)* |
| Top-right badge | none | `<Badge variant="secondary">Supplemental</Badge>` |

**Badge**:
- Use existing shadcn `<Badge variant="secondary">`. Maps to `bg-secondary text-secondary-foreground` — a warm muted tone in this palette. No new tokens.
- Label: `Supplemental` (sentence case, Plus Jakarta Sans, `text-xs`, `font-medium`). **Not uppercase** — uppercase reads like a SaaS dashboard, which the constitution explicitly forbids.
- Position: top-right of the card.

**Why these choices**:
- `bg-muted/50` is the existing warm-beige fill at 50% opacity — softer than the default card without introducing a new color.
- Same border keeps the shape consistent. The eye reads "same kind of thing, different category" — not "different kind of thing."
- No reduced contrast on the title. Supplemental sessions are real work the user is supposed to do.
- Dark mode: all tokens already have dark variants in `globals.css`. No new dark-mode tokens needed.

---

## Migration (Issue 8 — accepted in review)

Existing training plans need both new split columns backfilled at migration time. `apply-schema.js` should:

1. `ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS training_sessions_per_week INTEGER`
2. `ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS supplemental_sessions_per_week INTEGER`
3. `ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS training_preferred_days TEXT` (JSON array)
4. `ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS supplemental_preferred_days TEXT` (JSON array)
5. `ALTER TABLE activities ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'training'`
6. `ALTER TABLE training_phases ADD COLUMN IF NOT EXISTS sport_focus_content TEXT`
7. `ALTER TABLE training_phases ADD COLUMN IF NOT EXISTS supplemental_content TEXT`
8. `ALTER TABLE training_phases ADD COLUMN IF NOT EXISTS mental_game_content TEXT`
9. One-shot `UPDATE training_plans SET training_sessions_per_week = ..., supplemental_sessions_per_week = ...` for rows where both are NULL, using the default formula against each plan's goal `sessionsPerWeek`.

All of the above must be idempotent. The migration must run cleanly against both a fresh DB and a production DB that already has data.

---

## Doc-change checklist for `scope.md`

The developer applies these edits to `scope.md`:

1. **Default split formula table**: add a footnote at `sessionsPerWeek = 2` that the UI surfaces a non-blocking hint about supplemental work being recommended by the source material.
2. **What we're building** section: add a line "Climbing only in V1. Tennis and running follow in V1.1 and V1.2 — same code, sport-by-sport content rollout."
3. **Resolved Decisions** table: change "Cycle restart behavior" from "Restarts everything" to "**Preserves the split** — cycle restart resets phase progress only. The training/supplemental split is a deliberate user preference."
4. Add a new row to **Resolved Decisions**: "Distribution algorithm" → "Dual preferred-days model. Training plan stores separate `trainingPreferredDays` and `supplementalPreferredDays`. Scheduler places each type on its own preferred days."

---

## Doc-change checklist for `spec.md`

The developer applies these edits to `spec.md`:

1. **Promote Story 4 (Session-Type-Aware Notes) to P1.** Update the priority note to reflect that filtered notes are the core value of the feature, not a refinement.
2. **Delete Story 6 (Cycle Restart Resets the Split)** in its entirety.
3. **Add to Edge Cases**: "Cycle restart resets phase progress only. The training/supplemental split is preserved as a deliberate user preference."
4. **Add to Edge Cases**: "If `sessionsPerWeek` changes on the goal after the plan exists, the saved split is preserved. The training-plan dialog shows a non-blocking warning when the split doesn't match the current `sessionsPerWeek`, with an option to reconcile. The scheduler falls back to the default formula for new generations until the user reconciles."
5. **Rewrite FR-007**:
   > "FR-007: Scheduler MUST attach session-type-aware notes:
   > - **Training sessions** → `sportFocusContent` + `mentalGameContent` for the current phase.
   > - **Supplemental sessions** → `supplementalContent` for the current phase.
   > - **Fallback**: when a phase has no structured content (legacy rows, or sports not yet migrated — tennis and running in V1), the existing `description` field is used. The fallback applies to both session types until the sport's content is restructured."
6. **Rewrite FR-010 with concrete tokens** (see "Supplemental design tokens" section above for exact spec).
7. **Add new FR-013**:
   > "FR-013: The training plan MUST store two separate sets of preferred weekdays — `trainingPreferredDays` and `supplementalPreferredDays`. The scheduler honors each set for its respective session type. Training takes priority if a day appears in both. If fewer preferred days are configured than sessions per week, the scheduler falls back to any available day (existing behavior, unchanged)."
8. **Add new FR-014**:
   > "FR-014: The training-plan creation dialog MUST surface a non-blocking hint at `sessionsPerWeek = 2` informing the user that the source material recommends supplemental work alongside training, and that the default will automatically include supplemental sessions at higher weekly volumes."
9. **Add new FR-015**:
   > "FR-015: Migration MUST backfill the training/supplemental split for existing training plans using the default formula against the plan's goal `sessionsPerWeek`. Migration MUST be idempotent."
10. **Update SC-002** with parenthetical: "...the calendar contains exactly 8 training and 4 supplemental sessions *(assuming no blackouts and sufficient preferred days are configured)*."
11. **Add to Key Entities**: "**Phase Content Layers**: three text fields on `training_phases` — `sportFocusContent`, `supplementalContent`, `mentalGameContent`. Existing `description` retained as fallback."
12. **Add to Key Entities**: "**Preferred Days Split**: two JSON-array fields on `training_plans` — `trainingPreferredDays` and `supplementalPreferredDays`."
13. **Add to Out of Scope**:
    - "Tennis and running phase content restructuring (deferred to V1.1 and V1.2)."
    - "Automatic reconciliation when `sessionsPerWeek` changes on the goal (manual reconcile only, with non-blocking warning)."

---

## Open items

None. All seven review issues are resolved. Ready to apply the deltas and move to `plan.md`.

---

## Notes for the developer

- The schema work in this feature is non-trivial. Don't underestimate the `training_phases` content restructuring — it's the heaviest implementation item, and shipping FR-001 / FR-002 / FR-010 without FR-007 produces a feature that looks done but doesn't solve the stated problem.
- Climbing-only V1 keeps the schema work universal but limits content-restructuring effort to one sport. Preserve that boundary in the plan.
- The dual preferred-days model fits cleanly into the existing scheduler. Don't rewrite the scheduler — extend the existing preferred-days logic to operate on two sets instead of one.
- Every API route added or modified must call `auth()` and scope queries with `WHERE user_id = session.user.id`. The current `training_plans` table already has `user_id`; verify the new columns inherit that scoping.
- Migration goes through `apply-schema.js`. Never `drizzle-kit migrate` in production.
