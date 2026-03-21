# Tasks: Savings Redesign

**Spec**: `.specify/specs/savings-redesign/spec.md`
**Status**: Not started
**Last updated**: 2026-03-21

---

## Overview

No schema migration is required for the new categories — they use the existing `spending_categories` table. One migration IS needed to add `savings_starting_balance` to `budget_settings`. The rest is API logic + UI changes.

**Total estimated effort**: 1–2 focused sessions.

---

## Phase 1: Schema & Defaults

**Purpose**: Add the starting balance column and the two new default categories. Everything else depends on this.

**⚠️ Do not start Phase 2 until the migration runs cleanly.**

- [ ] T001 Add `savingsStartingBalance` column to `budgetSettings` in `src/db/schema.ts`:
  - `savingsStartingBalance: real("savings_starting_balance").default(0)`
- [ ] T002 Generate and run migration: `npm run db:generate` then `npm run db:migrate` in `Life App/`
- [ ] T002b Add the new column to `apply-schema.js` so production deployments on Railway pick it up. In the `alterStatements` array (around line 326), add:
  ```js
  `ALTER TABLE budget_settings ADD COLUMN savings_starting_balance REAL DEFAULT 0`,
  ```
  This is safe to re-run — the `run()` helper already catches "duplicate column" errors and skips silently.
- [ ] T003 Add two new categories to `DEFAULT_SPENDING_CATEGORIES` in `src/lib/defaults.ts`:
  ```ts
  { name: "Savings", icon: "🏦", color: "#10B981" },
  { name: "Savings Withdrawal", icon: "💸", color: "#F59E0B" },
  ```
- [ ] T004 Seed the two new categories for all existing users who don't already have them. Create a one-time script `src/scripts/seed-savings-categories.ts` that:
  - Fetches all distinct `user_id` values from `spending_categories`
  - For each user, checks if "Savings" and "Savings Withdrawal" categories exist
  - If not, inserts them
  - Run once locally: `npx tsx src/scripts/seed-savings-categories.ts`
- [ ] T004b Add the same seeding logic to `apply-schema.js` so it runs automatically on the next Railway deployment for existing production users. Add a new section after the `alterStatements` block (before the admin bootstrap section):
  ```js
  // ─── 3. Seed new default spending categories for existing users ──────────────
  const categoryUsers = db.prepare("SELECT DISTINCT user_id FROM spending_categories").all();
  for (const { user_id } of categoryUsers) {
    const existing = db.prepare(
      "SELECT name FROM spending_categories WHERE user_id = ? AND name IN ('Savings','Savings Withdrawal')"
    ).all(user_id).map(r => r.name);
    if (!existing.includes('Savings')) {
      db.prepare("INSERT INTO spending_categories (name, icon, color, user_id) VALUES (?, ?, ?, ?)")
        .run('Savings', '🏦', '#10B981', user_id);
      console.log("apply-schema: seeded 'Savings' category for user", user_id);
    }
    if (!existing.includes('Savings Withdrawal')) {
      db.prepare("INSERT INTO spending_categories (name, icon, color, user_id) VALUES (?, ?, ?, ?)")
        .run('Savings Withdrawal', '💸', '#F59E0B', user_id);
      console.log("apply-schema: seeded 'Savings Withdrawal' category for user", user_id);
    }
  }
  ```
  Note: the existing admin bootstrap section becomes section 4 after this addition.

**Checkpoint**: Run the migration locally. Open the app. Navigate to Budget → Categories — you should see "Savings" and "Savings Withdrawal" in the list. ✓

---

## Phase 2: API — Fix Savings Calculation

**Purpose**: Replace the inferred "leftover money = savings" calculation with the explicit model.

- [ ] T005 Update `GET /api/budget/summary` in `src/app/api/budget/summary/route.ts`:
  - Remove the existing iterative month-by-month savings calculation (the large `while (d <= currentMonthDate)` loop)
  - Replace with: fetch all `spendingEntries` for this user where `category = "Savings"` → sum amounts → add `settings.savingsStartingBalance ?? 0`
  - Subtract: fetch all `spendingEntries` where `category = "Savings Withdrawal"` → sum amounts
  - Floor result at 0
  - Keep the existing `savingsGoal` shape in the response (`{ total, targetDate, saved, percentage }`) — just `saved` changes
- [ ] T006 Update `GET /api/budget-settings` in `src/app/api/budget-settings/route.ts` to include `savingsStartingBalance` in the response
- [ ] T007 Update `PATCH /api/budget-settings` to accept and persist `savingsStartingBalance`

**Checkpoint**: Open Budget → Budget Goals. Log a €100 Savings entry in Log Spending. Verify the savings progress increases by exactly €100. Navigate back to previous months — the total should NOT change based on unspent budget. ✓

---

## Phase 3: UI — Budget Settings (Starting Balance)

**Purpose**: Let the user configure their starting savings balance.

- [ ] T008 Add "Starting savings balance (€)" field to `src/components/budget/budget-settings-dialog.tsx`:
  - New `Input` field below the existing savings goal fields
  - Label: "Existing savings (€)" with helper text: "Money you already had saved before using this app"
  - Wire to `savingsStartingBalance` via PATCH on save
- [ ] T009 Add the starting balance field to the Savings Goal editor in `src/components/budget/budget-goals.tsx`:
  - Place it alongside the existing `savingsGoalTotal` and `savingsGoalTargetDate` inputs in the same edit form (not a separate section)
  - Label: "Existing savings (€)" with helper text: "Money you already had saved before using this app"
  - Wire it to `savingsStartingBalance` via the existing `handleSaveGoal` → PATCH `/api/budget-settings` flow

**Checkpoint**: Open Budget Settings (gear icon on Dashboard). Enter a starting balance of €1,000. Save. Navigate to Budget Goals — verify the saved total reflects the starting balance correctly. ✓

---

## Phase 4: UI — Savings Goal on Dashboard

**Purpose**: Surface the savings goal on the main Dashboard tab so it's immediately visible.

- [ ] T010 Add a savings goal progress card to `src/components/budget/budget-dashboard.tsx`:
  - Only render if `summary.savingsGoal` is non-null
  - Show: amount saved, goal total, target date (if set), progress bar, percentage
  - Position: after the 4 summary stat cards, before the charts
  - Use the same card style as the existing Savings Goal card in `budget-dashboard.tsx` (already exists — move/duplicate it to be always visible on the dashboard, not just inside the charts grid)
  - If goal is 100%+ complete, show a green "Goal reached 🎉" indicator instead of the progress bar

**Checkpoint**: Set a savings goal. Log a Savings entry. Open the Dashboard tab — the savings goal card should be visible without clicking any other tab. ✓

---

## Dependencies & Execution Order

| Phase | Depends on | Notes |
|---|---|---|
| Phase 1 (Schema & Defaults) | Nothing | Must complete before everything else |
| Phase 2 (API) | Phase 1 (migration done, `savingsStartingBalance` column exists) | |
| Phase 3 (Settings UI) | Phase 2 (API accepts `savingsStartingBalance`) | |
| Phase 4 (Dashboard UI) | Phase 2 (API returns updated `savingsGoal.saved`) | Can run in parallel with Phase 3 |

---

## Important Notes

- **The old savings calculation is a complete replacement** — do not try to merge it with the new one. Delete the entire `while` loop and replace it.
- **Category name matching is case-sensitive** in the calculation. The API checks `category = "Savings"` — this must exactly match the default category name. If a user renames their category, the calculation won't pick it up. This is acceptable for now.
- **Savings entries still appear in the spending pie chart** — that is correct. Savings are a category of where your money goes. Do not filter them out.
- **Both categories count toward monthly spending total** — a €500 Savings entry reduces your remaining spending budget for that month, as it should (you sent that money away).
