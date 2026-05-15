# Tasks: Goal progress ignores activity logs when metric is "Sessions"

**Tasks ID**: `goal-progress-sessions-fix`
**Created**: 2026-05-14
**Status**: Draft. Pending user approval before implementation.
**Source documents**: `scope.md`, `spec.md`, `plan.md`

---

## How to read this file

Same conventions as other features in this repo: tasks are sequential within the PR, IDs are monotonic, each task has an action statement, target files, acceptance, and blocked-by. FR references trace each code edit back to `spec.md`.

This is a hotfix. There are only two code edits. The task list is short.

Tag conventions:

- `[SETUP]`: branch hygiene.
- `[AUDIT]`: read-only inspection.
- `[GATES]`: bookkeeping before ship.
- `[SHIP]`: commit, push, open PR.
- `[VERIFY]`: post-merge production checks.

---

## T001 [SETUP], cut the fix branch

- Action: From current `master`, create branch `fix/goal-progress-sessions`. Confirm `git status --short` is empty before branching.
- Files: none.
- Acceptance: branch exists locally; `git log --oneline -1` shows the current master HEAD; working tree clean.
- Blocked-by: none.

## T002 [SETUP], commit the spec docs

- Action: Stage `scope.md`, `spec.md`, `plan.md`, `tasks.md` from `Life App/feature requests/goal-progress-sessions-fix/`. Commit with message `docs(goal-progress-sessions-fix): scope + spec + plan + tasks for the hotfix`.
- Files: the four docs in this folder.
- Acceptance: one new commit on the branch; the next steps build on top of it.
- Blocked-by: T001.

---

## T003 [AUDIT], pre-edit consumer sweep (FR-007)

- Action: Before touching the route, run `rg "targetMetric" src/` and inspect each hit. Confirm the only place that gates behavior on `targetMetric != null` is the progress route at lines 138 and 192. Form, type definitions, and DB writes use `targetMetric` but do not gate on its null-ness in a way the fix could regress.
- Files: read-only inspection.
- Acceptance: written summary (in developer notes, not committed) listing each consumer and confirming none other than the progress route gates on `targetMetric != null`. If a surprise consumer is found, STOP and surface the finding before continuing.
- Blocked-by: T002.

---

## T004, edit the yearly branch (FR-001, FR-002)

- Action: In `src/app/api/goals/[id]/progress/route.ts` lines 138-150, remove the outer `if (goal.activityTypeId != null && metric != null)` wrapper. The contents of the `if` block become unconditional. Change the final line from `sumMetricFromLogs(logs, metric)` to `sumMetricFromLogs(logs, metric ?? "count")`. Indentation reflows by one level.
- Files: `src/app/api/goals/[id]/progress/route.ts`.
- Acceptance: the yearly branch queries `activity_logs` unconditionally; the metric defaults to `"count"` when `null`. `npx tsc --noEmit` is clean for this file. Manual read-through confirms the resulting code matches `plan.md` section 4.1 verbatim.
- Blocked-by: T003.

## T005, edit the monthly branch (FR-003)

- Action: In the same file at lines 192-204, apply the same shape of change: remove the `if` wrapper, default `metric` to `"count"` in the `sumMetricFromLogs` call. The monthly branch uses `eq(activityLogs.goalId, goalId)` rather than `inArray`; keep that as-is. Only the gate and the metric default change.
- Files: `src/app/api/goals/[id]/progress/route.ts`.
- Acceptance: the monthly branch matches `plan.md` section 4.2 verbatim. tsc clean. Manual read-through confirms no other change crept in.
- Blocked-by: T004.

---

## T005a, edit the children-route branch (FR-001 spirit, added 2026-05-15)

- Origin: surfaced by the T003 audit. The plan's section 4.5 final sweep was supposed to confirm "the only consumer of the field that gates behavior on `!= null` is the progress route." The audit (executed before any code edit) found the same gate at `src/app/api/goals/[id]/children/route.ts:43` for the children-progress endpoint that feeds the per-month child cards under a yearly parent goal. Same bug, same shape of fix, same feature surface. Scope extension reasoned and documented here before code is touched.
- Action: In `src/app/api/goals/[id]/children/route.ts` lines 43-57, remove the outer `if (child.activityTypeId != null && child.targetMetric != null)` wrapper. The contents of the `if` block become unconditional. The inline metric switch at lines 49-55 must handle `targetMetric === null` by defaulting to the `"count"` path. The simplest reshape: extract `const metric = child.targetMetric ?? "count"` first, then run the existing switch. Indentation reflows by one level.
- Files: `src/app/api/goals/[id]/children/route.ts`.
- Acceptance: the children branch queries `activity_logs` unconditionally; null `targetMetric` defaults to the count path. tsc clean. Manual read-through confirms only this block changed in the file. The pre-existing `goalTallies` query at lines 59-60 is unchanged.
- Blocked-by: T005.

---

## T006 [GATES], run verification gates

- Action: Run each gate from `plan.md` Section 2 in order:
  1. `npx tsc --noEmit`.
  2. `npm run test -- --run`.
  3. Per-file lint for each modified file:
     - `npx eslint "src/app/api/goals/[id]/progress/route.ts"`
     - `npx eslint "src/app/api/goals/[id]/children/route.ts"` (added after T005a)
- Files: none (verification only).
- Acceptance: tsc clean; tests all green at the same count as master (no regressions, no new tests required); eslint shows no new errors or warnings for either modified file versus master.
- Blocked-by: T005a.

---

## T007 [SHIP], commit and open PR

- Action:
  - Stage the route file. Commit with message `fix(goals): count activity logs by goalId in yearly and monthly progress when metric is null`.
  - Push branch to `origin`.
  - Open PR against `wvanloco-alt:master` titled `fix(goals): yearly/monthly goal progress ignores activity logs when metric is "Sessions"`.
  - PR body MUST:
    - Link to `scope.md` and `spec.md` in the diff.
    - State that the user's existing goal 30 will jump from 0 to 2 sessions on deploy (this is the intended fix, not a side effect).
    - Call out the audit-driven scope extension: `children/route.ts` was added during T003 because it carried the same bug shape. Three code edits total, not two.
    - Note no tests added; manual smoke checklist linked.
    - Mention the form cleanup deferred to a follow-up small-change item.
- Files: none (git operations).
- Acceptance: PR is open and CI passes (or has only pre-existing failures). PR body is honest about the destructive-ish behavior change.
- Blocked-by: T006.

---

## T008 [VERIFY], manual smoke on Railway after deploy

- Action: After the PR merges and Railway auto-deploys:
  - SC-001: open the user's "no drinking alcohol" yearly goal (goal 30). Confirm the progress card shows 2 sessions, not 0. Confirm the percentage updates correspondingly.
  - SC-002: create a new activity-tracker log for that goal. Reload the goal page. Confirm the progress count incremented by 1.
  - SC-003: pick one other goal that was already showing correct progress before this fix (a yearly goal with `targetMetric = "duration"` or `"grade"` is the strongest test). Note the current value before the merge, then re-check after. Confirm the value is unchanged.
  - SC-001 child-card check (added per T005a): if goal 30 has monthly child goals, expand the parent to view them. Each child's progress card should reflect any activity-tracker logs linked to that child's `goalId` (or show 0 if no logs are linked). If a previously-working child shows a number change, surface immediately; that would be a regression.
- Files: none (production walkthrough).
- Acceptance: all three success criteria pass on the deployed app. If SC-003 shows a number change for a previously-working goal, surface immediately; that would be a regression.
- Blocked-by: T007 is merged AND Railway has confirmed a successful deploy.

---

## Cross-task notes

- This is one PR. After the T003 audit surfaced `children/route.ts` as a same-shape consumer, scope grew from two code edits to three. T005a was added on 2026-05-15 to cover the third edit. The git history preserves the pre-audit task plan in commit 3ea47ba; the post-audit extension lands in a separate docs commit so the reasoning is reviewable.
- T008 SC-003 is the regression check. The fix is meant to be invisible to goals that were already working. If a previously-working goal's number changes after deploy, the diagnosis was incomplete and the fix needs revisiting.
- Form cleanup is intentionally NOT in this task list. It belongs in a follow-up `small-changes-batch-2` or a dedicated small item.

## Definition of done

- The PR from T007 is merged into `wvanloco-alt:master`.
- T008 passes (three success criteria verified on production).
- The local branch `fix/goal-progress-sessions` and its remote counterpart are deleted.
- The user confirms goal 30 advances correctly from new activity-tracker logs (no more need to use the "Log Progress" button as a workaround).
