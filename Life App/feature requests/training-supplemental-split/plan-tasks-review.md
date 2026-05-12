# Review: Plan + Tasks for Training vs. Supplemental Session Split

**Feature ID**: `training-supplemental-split`
**Reviewer role**: review agent only (no edits to `plan.md` or `tasks.md`)
**Review date**: 2026-05-11
**Companion**: see [`review.md`](./review.md) for the scope + spec review that preceded this one.
**Status**: Substantive issues found. Decisions resolved with the user. Apply the deltas in section 4 before implementation starts.

---

## Summary

The plan and tasks are well-formed and disciplined. Phases are independently shippable, the migration strategy is idempotent and safe, and the architecture-critical finding (climbing content is already structured as three layers) is real — I verified it in `src/lib/training/periodization.ts:26-93`. That finding transforms the heaviest concern from the original spec review (FR-007 content restructuring) into a save-side change.

Seven substantive issues remain. Most are quick fixes; two are structural (file-path errors and an over-large scheduler task) and should be addressed before a developer starts implementation.

---

## What's strong (keep)

1. **The architecture-critical finding holds.** `PHASE_CONTENT` in `src/lib/training/periodization.ts` already exposes `climbing`, `supplemental`, and `mentalGame` per phase. `buildClimbingPhaseDescription` concatenates them with header strings. The "restructuring" work for V1 is exposing existing structure, not rewriting content. Plan's estimate-changing claim is verified.

2. **Migration strategy.** Idempotent `ALTER TABLE ADD COLUMN`, backfill UPDATE gated by `IS NULL` (T005), uses `apply-schema.js` (production rule honored). Drizzle schema and `apply-schema.js` correctly treated as parallel sources of truth that must agree.

3. **Legacy `description` stays populated.** Smart hedge. Decouples this feature from any downstream cleanup. The wrapper pattern in T008 means the legacy column is free-by-construction.

4. **Cycle restart preservation is explicit (T013).** The decision from the scope + spec review is now baked in.

5. **Phases are independently shippable.** Phase 1 ships nothing visible. Phase 2 ships invisible-to-user data. Phase 3 ships scheduler behavior that becomes visible. Each verifies on its own. This is "small steps" done right.

6. **Risk register exists and names real risks.** Most plans skip this.

---

## Issues found and resolutions

### Issue 1 — File paths in Phase 5 don't match the codebase

**Finding**: Three of four file paths the plan references in Phase 5 are wrong:

| Plan says | Actual path in the codebase |
|---|---|
| `src/components/calendar/monthly-plan-view.tsx` | No `calendar/` directory exists. Closest file: `src/components/monthly-plan/weekly-plan-view.tsx` |
| `src/components/calendar/weekly-plan-view.tsx` | `src/components/monthly-plan/weekly-plan-view.tsx` |
| `src/components/today/daily-view.tsx` | `src/components/daily/daily-view.tsx` (the `today` page imports from `daily/`) |

A developer following the plan literally will chase dead paths.

**Resolution**: Rewrite T027 and T028 with verified file paths. The general "confirm during implementation" pattern in the plan should be replaced with verified paths wherever the verification takes seconds — which it does for all of these.

---

### Issue 2 — No shared activity-card component exists

**Finding**: Phase 5's visual treatment assumes a shared activity card. I checked `src/components/monthly-plan/day-column.tsx:83-85` — activities are rendered inline. There is no shared `ActivityCard` component. Every render site needs the supplemental treatment applied independently.

Initial scan of activity render sites (non-exhaustive):
- `src/components/monthly-plan/day-column.tsx`
- `src/components/monthly-plan/weekly-plan-view.tsx`
- `src/components/monthly-plan/schedule-preview.tsx` (the proposal preview before applying)
- `src/components/daily/daily-view.tsx`
- Activity list rendering on the Activities page (if separate)

Without a discovery step, the implementer will likely apply the treatment to the two or three obvious places, miss one or two, and the feature ships with supplemental sessions styled correctly in some views but identical to training in others.

**Resolution**: Insert a new discovery task before T027:

> **T026.5 — Discovery**: Grep for every activity-card rendering site (search `activity.title`, `activity.notes`, or similar). List them inline in this task. Then T027 and T028 apply the helper to every site enumerated here. Optional follow-up: if the rendering markup is substantially similar across 3+ sites, propose extracting a shared `ActivityCard` component — but only if the duplication is real, not theoretical.

---

### Issue 3 — T016 is too big and hides the riskiest work

**Finding**: T016 (scheduler logic update) bundles four concerns into one task:
- Compute weekly target counts per goal per ISO week
- Place training sessions on `trainingPreferredDays`, fall back to "any available day"
- Place supplemental on `supplementalPreferredDays`, resolve overlap (training wins)
- Tag each `ProposedActivity` with `sessionType`, including no-plan goals

The scheduler is the highest-risk module in the codebase. A single task framing hides the complexity and makes failure modes harder to diagnose.

**Resolution**: Split T016 into four sub-tasks, each independently testable:

- **T016a** — Compute weekly target counts per goal per ISO week. Pure function, unit-testable.
- **T016b** — Day-picking logic for training sessions (honors `trainingPreferredDays`, falls back to "any available day").
- **T016c** — Day-picking logic for supplemental sessions (honors `supplementalPreferredDays`, training takes priority on any shared day).
- **T016d** — Tag each `ProposedActivity` with the correct `sessionType`. Goals with no training plan default to `"training"`.

The scheduler tests in T032 should then map 1:1 to these sub-tasks where possible.

---

### Issue 4 — Effort estimate is optimistic

**Finding**: Tasks claim **3–5 focused sessions**. Counting honestly: 35 tasks, of which T015 / T016 / T017 / T018 are non-trivial scheduler surgery; T020–T024 are dialog UI with validation states; T031–T034 are real test work; and the migration testing against a copy of production data is a session in itself.

The optimism isn't a problem in principle (ship to learn, not be right). It becomes a problem if the user is planning other work against the estimate.

**Resolution**: Update the estimate to **6–9 focused sessions** with the following breakdown:
- Phase 1: 1 session (schema + migration + types).
- Phase 2: 1 session (climbing content emission).
- Phase 3: 2 sessions (scheduler logic, after split — Issue 3).
- Phase 4: 1–2 sessions (dialog UI, validation, edit mode).
- Phase 5: 1 session (visual treatment across all enumerated render sites).
- Phase 6: 0.5 sessions (activity edit form field).
- Phase 7: 1 session (unit tests + manual walkthrough + ROADMAP/data-model/api-routes updates).

Or remove the estimate entirely. An uncertain estimate that anchors expectations is worse than no estimate.

---

### Issue 5 — SQL backfill should be tested, not just reviewed

**Finding**: T005's backfill SQL uses `MIN(2, MAX(0, g.sessions_per_week - 2))`. In SQLite, `MIN()` and `MAX()` work as scalar functions when given 2+ arguments. The query *should* work. But "should work" SQL run once against a production DB is the kind of thing that goes wrong silently.

**Resolution**: Add a Vitest case in T031 that runs the actual backfill SQL against an in-memory SQLite (`new Database(':memory:')`) with a seeded `goals` table at known `sessions_per_week` values (1 through 7), executes the UPDATE, and asserts the resulting split values match the formula table from `spec.md`. This is cheap and proves the SQL produces the same math the JavaScript helper produces.

No need for defensive `COALESCE` wrapping — the FK cascade prevents the orphan case the plan worries about.

---

### Issue 6 — T013 is a verification masquerading as a task

**Finding**: T013 reads "Verify `POST /api/training-plans/[id]/restart/route.ts` does NOT touch the split columns." That's a check, not an action. What if the verification fails? No follow-up specified.

**Resolution**: Reframe T013:

> **T013** — Audit the restart endpoint. Identify any UPDATE / INSERT / DELETE on `training_plans` rows during restart. If any path touches the new split columns, modify the logic so it doesn't. Add a regression test in `src/lib/__tests__/training-supplemental-split.test.ts` that simulates a restart on a plan with a manually-edited split (e.g., 1+2 on a 3-sessions/week goal) and asserts the split values are unchanged after the restart.

---

### Issue 7 — Constitutional documentation propagation is missing

**Finding**: The constitution and the agent onboarding doc list these as sources of truth:
- `Life App/specs/master/data-model.md` — database schema
- `Life App/specs/master/contracts/api-routes.md` — all REST endpoints
- `Life App/specs/master/tasks.md` — completed work log

This feature adds 9 columns and one new route handler. T035 updates `ROADMAP.md` but none of the three constitutional sources of truth. Constitution requires it.

**Resolution**: Add to Phase 7:

- **T035a** — Update `specs/master/data-model.md`. Add the new columns on `training_plans`, `training_phases`, and `activities`. Include types and defaults.
- **T035b** — Update `specs/master/contracts/api-routes.md`. Add the new `PATCH /api/training-plans/[id]` route. Update request body schemas for `POST /api/training-plans`, `POST /api/schedule/generate`, `POST /api/schedule/apply`, `PATCH /api/activities/[id]` with the new fields.
- **T035c** — Update `specs/master/tasks.md` with the feature shipping entry, dated and linked to the spec.

---

## What we explicitly chose not to flag (and why)

These came up in conversation but were dropped as nit-picky:

- **PATCH route wording** in T012 ("add or update" vs "add"). Cosmetic. The route file exists with only a DELETE handler — the developer will figure it out.
- **Defensive `COALESCE` on the backfill subquery**. Over-defensive. The FK cascade rules out the orphan case.
- **"Run `npm run test:run` before declaring done."** Should be obvious to any developer. Padding to call it out.
- **Reconcile warning styling (`bg-amber-50 dark:bg-amber-950`)**. Possibly fine — Tailwind v4 + the project's `globals.css` may remap amber to OKLCH. Not verified during this review; flagging unverified concerns is the hallucination trap the constitution warns against.

---

## Doc-change checklist for `plan.md`

1. Fix file paths in Phase 5: replace `src/components/calendar/*` with `src/components/monthly-plan/*` and `src/components/today/*` with `src/components/daily/*`.
2. Replace the "confirm during implementation" hedges with verified paths.
3. Adjust effort estimate (or remove).

## Doc-change checklist for `tasks.md`

1. Fix file paths in T027 and T028.
2. Insert **T026.5** before T027 — activity-card render-site discovery.
3. Split **T016** into **T016a**, **T016b**, **T016c**, **T016d**.
4. Reframe **T013** as an audit + fix + regression test (see Issue 6).
5. Add **T031** Vitest case for the backfill SQL against an in-memory SQLite (see Issue 5).
6. Add **T035a / T035b / T035c** for documentation propagation (see Issue 7).
7. Update the "Total estimated effort" line.

---

## Open items

None. All seven issues are resolved. Ready to apply the deltas and start Phase 1.

---

## Notes for the developer

- The schema and scheduler changes are the riskiest parts. The dialog UI and visual treatment are mechanical once the data flows correctly.
- Verify file paths in the codebase as you go — the plan was written with some unverified path guesses. Treat any "confirm during implementation" as a discovery step, not a maybe.
- The legacy `description` column stays populated for climbing phases (the wrapper pattern in T008). Do not be tempted to remove it during this feature; it's a safety net against any downstream code path that still reads it.
- `apply-schema.js` migrations must be idempotent and safe to run on every Railway boot. The backfill UPDATE is gated by `IS NULL` — never remove that guard.
- Cycle restart must preserve the split (FR-009). The T013 audit is non-optional.
- Every API route added or modified must call `auth()` and scope queries with `WHERE user_id = session.user.id`. The new columns inherit the existing `user_id` scoping on `training_plans` and `activities`.
