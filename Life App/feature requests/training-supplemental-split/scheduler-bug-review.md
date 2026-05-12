# Bug Review: Scheduler caps sessions per week below configured split total

**Feature ID**: `training-supplemental-split`
**Reviewer role**: review agent only (no edits to source)
**Review date**: 2026-05-11
**Reported by**: user on 2026-05-11. Goal has `sessionsPerWeek = 7`, plan split `4 training + 3 supplemental`. Calendar shows ~3 sessions per week instead of 7.
**Severity**: High — the split is the primary user-facing promise of this feature; if `4 + 3 = 3` in practice, the feature is broken from the user's perspective.

---

## Reproduction (as reported)

1. Create a goal with `sessionsPerWeek = 7`.
2. Create a climbing training plan and override the split to `trainingSessionsPerWeek = 4`, `supplementalSessionsPerWeek = 3`.
3. Generate a schedule.
4. **Expected**: ~7 sessions per week (4 training, 3 supplemental), respecting blackouts.
5. **Observed**: ~3 sessions per week. Several sessions missing entirely.

The user has not yet shared whether the 3 placed are all `training`, all `supplemental`, or mixed. That detail narrows the diagnosis (see "Confirmations needed" below).

---

## What I verified is correct

The data path from training-plan storage to the placement loops is wired correctly:

- `src/app/api/schedule/generate/route.ts:207-261` builds `trainingPlanSplitMap` from `training_plans` rows, falling back to `defaultSplit(spwForSplit)` when the columns are null. Passed to `generateSchedule` at line 261.
- `src/lib/scheduler.ts:331-351` defines `GoalSlot` with `planSplit`, `trainingTotalNeeded`, `supplementalTotalNeeded`, and separate placed counters.
- `src/lib/scheduler.ts:420-476` calls `allocateSplitTotals` to set per-goal totals. For `sessionsPerWeek = 7`, `numWeeks = 1`, `sessionsRemaining = 7`, the helper returns `{ trainingTotal: 4, supplementalTotal: 3 }` — confirmed by reading `src/lib/training/split.ts:69-83`.
- `src/lib/scheduler.ts:580-626` is `placeWeekByWeek` for split goals: two inner loops, training first (up to `targets.trainingCount = 4`), then supplemental (up to `targets.supplementalCount = 3`).

So `generateSchedule` is *trying* to place 4 + 3 per week. The bug is in the rejection logic inside `tryPlaceSession`.

---

## Most likely root cause

Even when `planSplit` is configured, the scheduler still consults `gs.sessionPatterns` if any are set on the goal:

```797:809:Life App/src/lib/scheduler.ts
  for (const dc of scoredDays) {
    if (countActivitiesOnDate(dc.date, occupied) >= settings.maxActivitiesPerDay) {
      continue;
    }

    if (currentPattern) {
      if (violatesPatternRest(dc.date, gs, currentPattern)) continue;
    } else {
      const violatesRest = roleIds.some((rid) =>
        violatesRestConstraints(rid, dc.date, roleDaySessions, rolesById)
      );
      if (violatesRest) continue;
    }
```

`violatesPatternRest` reads the *previous* pattern's `restDaysAfter` and blocks placement on any date within that rest window:

```1029:1047:Life App/src/lib/scheduler.ts
function violatesPatternRest(
  date: string,
  gs: GoalSlot,
  _currentPattern: SessionPattern
): boolean {
  if (gs.usedDays.size === 0) return false;

  const prevPatternIdx = (gs.patternIndex - 1 + (gs.sessionPatterns?.length ?? 1)) % (gs.sessionPatterns?.length ?? 1);
  const prevPattern = gs.sessionPatterns?.[prevPatternIdx];
  const requiredRest = prevPattern?.restDaysAfter ?? 1;

  const [y, m, d] = parseDateParts(date);
  for (let offset = 1; offset <= requiredRest; offset++) {
    const nearDate = formatDate(new Date(y, m - 1, d - offset));
    if (gs.usedDays.has(nearDate)) return true;
  }

  return false;
}
```

The math:

| `restDaysAfter` on every pattern | Max sessions/week the scheduler will place |
|---|---|
| 0 | 7 |
| 1 | 4 (Mon, Wed, Fri, Sun) |
| 2 | **3** (Mon, Thu, Sun) |
| 3 | 2 |

The user is seeing exactly **3 sessions per week**. That matches `restDaysAfter = 2` on every pattern. Given the default in `POST /api/goals/[id]/session-patterns` is `restDaysAfter ?? 1`, this strongly suggests the user (or earlier code) configured the patterns with `restDaysAfter = 2`, OR multiple patterns each demanding a 1-day rest stack up against `gs.usedDays` from earlier placements in the same week.

When `placeWeekByWeek` hits a `!placed` from `tryPlaceSession`, it `break`s out of the loop (`scheduler.ts:604` and `scheduler.ts:624`). So once the rest constraint blocks the next valid day, the training loop terminates early — and the supplemental loop runs against the same `usedDays` constraint, but with fewer remaining days, so it also terminates early.

**Net effect**: the configured split is silently capped by `goal_session_patterns`, with no warning surfaced to the user except the generic `Could only fit X/Y sessions` message at scheduler completion.

---

## Why this is a bug (not a feature)

`goal_session_patterns` predates the training plan split. It was the user-facing way to express "session 1 is intense, then rest 2 days." The split is the *new* user-facing way to express weekly volume.

The two systems now conflict, and the scheduler treats `goal_session_patterns` as the senior signal silently. From the user's perspective, the split they configured ("I want 7 sessions per week — 4 training, 3 supplemental") was simply ignored. They got 3 sessions and no clear explanation.

This violates the principle from `spec.md` that the configured split is the user's primary signal of weekly intent.

---

## Secondary suspects (lower likelihood, worth ruling out)

1. **`scheduler_settings.maxActivitiesPerDay`** (default 4). If the user has other activities (recurring or scheduled) filling slots, the count drops. But `maxActivitiesPerDay` is a *day-level* cap, not a goal-level one, and the user would need 4+ existing activities/day across 4+ days to reduce a single goal's placement to 3. Possible but unlikely.

2. **`role.minRestDays`** on the goal's primary role. Default is 0 (per `apply-schema.js:48` and the corresponding `CREATE TABLE` block). If non-zero, same shape of bug — but only in the `else` branch of the rest check (no session patterns). Since session patterns appear to be present here, this is unlikely.

3. **`preferredTimeSlot` + `findSlotInWindows` failing**. If the goal has a tight `preferredTimeSlot` window (e.g., "morning") and other activities occupy that window most days, slot-finding fails. There is a fallback to `anyWindows` (`scheduler.ts:854-889`) so this should not drop to 3 unless windows are truly saturated.

4. **`allocateSplitTotals` rounding edge case**. For `sessionsRemaining = 7, numWeeks = 1, ratio = 4:3`, math gives `trainingTotal = round(7 * 4 / 7) = 4` and `supplementalTotal = 3`. Math is correct.

---

## Confirmations needed from the user (to nail the root cause)

1. **Are the 3 sessions all training, all supplemental, or mixed?**
   - All training (3/4) + 0 supplemental → supplemental loop blocked entirely after training fills `usedDays`. Confirms the `gs.sessionPatterns` hypothesis.
   - 3 training + 0 supplemental and training_total_needed is 4 → same.
   - Mixed (e.g., 2 training + 1 supplemental) → also consistent with `gs.sessionPatterns` interleaving.
   - All supplemental → different bug; training preferred days might be unreachable.

2. **Does the goal have `goal_session_patterns` configured?**
   - Quick SQL check:
     ```sql
     SELECT goal_id, position, label, rest_days_after FROM goal_session_patterns;
     ```
   - If yes, what `rest_days_after` values?

3. **What `scheduler_settings.maxActivitiesPerDay` is set?**
   - Quick SQL:
     ```sql
     SELECT user_id, max_activities_per_day FROM scheduler_settings;
     ```

4. **What does the goal's preferred-time-slot field hold?** (`goals.preferredTimeSlot`)

5. **Is the generated schedule a "week" scope or "month" scope?** The placement loop logic is identical, but month scope reveals whether the bug is consistent across all weeks or only some.

6. **Does the proposal include a warning?** Look for `Could only fit 3/7 sessions for "<goal title>"` in the schedule-preview UI or the API response. If yes, that confirms the early-break in `placeWeekByWeek`.

---

## Recommended fix direction (for the developer — not implemented here)

Three options, in order from least invasive to most:

### Option A — Make session patterns optional when split is configured

In `tryPlaceSession`, when `gs.planSplit` is set, **skip the `violatesPatternRest` check** and fall back to role-based rest (`violatesRestConstraints`), which uses `role.minRestDays` and defaults to 0.

Rationale: when the user has explicitly configured a weekly split, that is the senior signal. `goal_session_patterns` should not silently veto it.

```ts
if (currentPattern && !gs.planSplit) {
  if (violatesPatternRest(dc.date, gs, currentPattern)) continue;
} else if (!gs.planSplit) {
  const violatesRest = roleIds.some((rid) =>
    violatesRestConstraints(rid, dc.date, roleDaySessions, rolesById)
  );
  if (violatesRest) continue;
}
```

**Risk**: existing users who configured session patterns *and then* configured a split would lose the rest-day enforcement they previously had. Minor, since the split is brand new and most users won't have both.

### Option B — Surface the conflict in the training-plan dialog

When the user saves a split where `(trainingSessionsPerWeek + supplementalSessionsPerWeek)` would exceed what the session patterns allow, show a non-blocking warning at save time: *"Your goal's session patterns prescribe X rest days, which limits you to ~Y sessions/week. Reduce your split or remove the patterns."*

**Cost**: more UI work. Doesn't fix the silent failure for users who already have both configured.

### Option C — Replace `restDaysAfter` blocking with scoring

Convert the hard veto in `violatesPatternRest` into a *score penalty* (e.g., +500) so the scheduler prefers non-rest days but doesn't refuse to place if no other option exists.

**Risk**: changes the semantics of `goal_session_patterns` for users who relied on the hard rest. Probably more invasive than warranted for a V1 bug fix.

**My recommendation**: **Option A** (least invasive, aligns with the spec's intent that the split is the user's primary signal). Surface a warning in the schedule-preview UI when fewer sessions get placed than configured — the warning text from `scheduler.ts:528-530` already exists; the bug is that it's easy to miss.

---

## Files to look at when fixing

- `src/lib/scheduler.ts:797-865` — the `tryPlaceSession` rest-check logic.
- `src/lib/scheduler.ts:580-626` — the dual-loop placement in `placeWeekByWeek`.
- `src/lib/scheduler.ts:1029-1047` — `violatesPatternRest`.
- (Optional, for Option B) `src/components/goals/training-plan-dialog.tsx` — the save-side validation.

---

## Out of scope for this bug

- Refactoring `goal_session_patterns` semantics for non-split goals.
- Rewriting the placement algorithm.
- Adjusting the default formula or the validation rules from the original spec.

These are not what this bug is about. The user configured a valid split. The scheduler should honor it (or warn loudly if it cannot). Today, it silently ignores it.

---

## Open questions

- Should `goal_session_patterns` be deprecated once the split feature ships? The two systems are now expressing overlapping concepts (weekly rhythm). Worth a separate discussion after this bug is fixed.
- Should the schedule-preview UI surface the "Could only fit X/Y" warning more prominently? Right now it's a string in the `warnings` array of the proposal; depends on how the preview component renders warnings.
