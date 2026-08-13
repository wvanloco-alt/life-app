# Tasks: Budget Forecasting

**Feature**: `budget-forecasting`  
**Branch**: `life-app-2.0`  
**Plan**: `.specify/specs/budget-forecasting/plan.md`  
**Total tasks**: 16  
**Revised**: 2026-08-12 — review fixes: savings-category exclusion, recurring-income resolution, current-month-is-projected rule, goal = monthly target × 12, base-vs-scenario chart series, test task added, cross-references corrected.

---

## Dependency Order

```
Phase 1 (library + tests + API)
  └─ Phase 2 (table — US1)
       ├─ Phase 3 (chart — US2)
       ├─ Phase 4 (scenario — US3)
       │    └─ Phase 5 (cell overrides — US4)
       └─ Phase 6 (polish)
```

Phase 1 must complete before any UI work. Phases 3, 4, and 5 can run in parallel once Phase 2 is done.

---

## Phase 1 — Foundation (library + tests + API)

> No UI yet. Testable by running the Vitest suite and hitting the endpoint.

- [x] T001 Add `ForecastPayload`, `ForecastMonth`, `Scenario` TypeScript interfaces to `src/types/index.ts` (shapes defined in plan.md)

- [x] T002 Create `src/lib/budget-forecast.ts` with three exported pure functions: `computeForecast(payload, overrides)`, `computeScenario(base, scenario)`, `computeTrajectory(months)`. Projection logic: **completed** months use actuals from payload (`isActual: true`); the current in-progress month and future months are projections (`isActual: false`) using `recurringIncome` for income, `fixedCostsByMonth[month]` for fixed costs, `spendingAverage` for spending (plus `plannedExpensesByMonth[month]` on top). `cumulative` accumulates from `savingsStartingBalance`. `shortfall` is true when `savings < monthlySavingsTarget`. `computeScenario` **adds** `oneTimeExpense.amount` to the targeted month's spending (an expense reduces savings) and **adds** `monthlyDelta` to every non-actual month's spending; actual months are never modified. Cell overrides keyed `"YYYY-MM:income"` | `"YYYY-MM:fixedCosts"` | `"YYYY-MM:spending"` replace the computed value for that cell (projected months only).

- [x] T003 Create `src/lib/__tests__/budget-forecast.test.ts` (Vitest). Minimum cases: (a) completed months pass actuals through, current month is projected; (b) January — all 12 months projected; (c) fixed cost with `endMonth` in June absent from Jul–Dec (SC-004); (d) cumulative accumulates from `savingsStartingBalance` and recalculates downstream when an override changes one month; (e) one-time expense increases the target month's spending and lowers all subsequent cumulative values; (f) `monthlyDelta` applies to non-actual months only; (g) clearing the scenario reproduces the base series exactly (SC-005); (h) override + scenario stack correctly (override applied first, scenario on top).

- [x] T004 Create `src/app/api/budget/forecast/route.ts`. Auth-gate first (`auth()` → 401 if no session). Query: (a) `budget_settings` for currency, `monthly_savings_target`, `savings_starting_balance`; (b) all `income_entries` for the current year + all recurring entries; (c) all `fixed_costs` with `is_active = true` (same filter as the summary route) active in any month of the current year (check `startMonth`/`endMonth` range); (d) all `spending_entries` for the current year; (e) all `planned_expenses` for the current year. Compute:
  - `recurringIncome`: sum of `is_recurring=true` entries, deduped by source keeping most recent (same logic as `/api/budget/summary` lines 46–50)
  - `actuals`: **completed months only** (exclude the current month). Per-month income MUST use the summary route's resolution: explicit entries for that month + recurring fill-in for sources with no explicit entry (lines 43–56 of the summary route) — explicit-only would show ~€0 for users who rely on recurring income. Per-month spending MUST exclude the `"Savings"` and `"Savings Withdrawal"` categories (they are savings contributions, not consumption). Per-month fixed costs MUST exclude the `"Savings"` category.
  - `fixedCostsByMonth`: per-month totals respecting active date ranges, excluding `"Savings"` category
  - `spendingAverage`: rolling average of the last 3 **completed** months (falling back to all available completed months), same category exclusions
  - `plannedExpensesByMonth`: one-off planned expense totals per month
  Return the `ForecastPayload` shape defined in plan.md.

---

## Phase 2 — Cash Flow Table (US1)

> MVP checkpoint: Forecast tab renders, 12-month table shows correct actuals and projections.

- [x] T005 [US1] Create `src/components/budget/forecast-table.tsx`. Props: `months: ForecastMonth[]`, `overrides: Record<string, number>` (needed to place the per-cell override indicator — a month-level flag can't identify which cell), `monthlySavingsTarget: number`, `currency: string`, `onOverride: (month: string, rowType: "income" | "fixedCosts" | "spending", value: number | null) => void`. Render a `<table>` with a sticky first column for row labels and 12 month columns. Rows: Income, Fixed Costs, Spending, a `border-t-2` divider row, Savings, Cumulative Savings. Column headers: 3-letter month abbreviations (Jan–Dec) with a "proj." sub-label for non-actual months (current month included). Completed months: full opacity. Projected months: `opacity-70`. Current month column: warm background tint (it is projected, but tinted to orient the user). Savings row values in Fraunces font. Shortfall cells: muted red text. All values formatted as currency. JetBrains Mono for all numeric cells. Editable cells (projected months only): pencil icon on hover, clicking opens an inline `<input>` that auto-selects on focus, confirms on blur/Enter, cancels on Escape, calls `onOverride` with the parsed number (or `null` to clear). Completed-month cells are not editable. Overridden cells (present in the `overrides` map) show a small amber dot indicator.

- [x] T006 [US1] Create `src/components/budget/budget-forecast.tsx`. This is the container component. On mount, fetch `GET /api/budget/forecast` and store as `raw`. Maintain `overrides: Record<string, number>` and `scenario: Scenario` in state. Derive two series per plan.md: `baseMonths = useMemo(() => computeForecast(raw, overrides), [raw, overrides])` and `scenarioMonths = useMemo(() => computeScenario(baseMonths, scenario), [baseMonths, scenario])`. Derive `annualGoal = raw.monthlySavingsTarget * 12`. Handle `handleOverride` to set/clear override entries. Render: page heading "Budget Forecast" (Fraunces), subtitle, then `<ForecastTable months={scenarioMonths} overrides={overrides} ...>`. Include the `<ForecastSkeleton>` loading state (built in T011). Show the empty state (built in T012) when no income data exists.

- [x] T007 [US1] Add "Forecast" tab to `src/components/budget/budget-page.tsx`. Add `TabsTrigger value="forecast"` (between "Dashboard" and "Log Spending") and `TabsContent value="forecast"` rendering `<BudgetForecast />`. Update the `grid-cols-6` to `grid-cols-7` on the TabsList. The month navigator (ChevronLeft/Right) should be hidden when the Forecast tab is active — the forecast always shows the current year, not a specific month (implemented in T014).

---

## Phase 3 — Savings Trajectory Chart (US2)

> Depends on Phase 2. Can be developed in parallel with Phases 4 and 5.

- [x] T008 [P] [US2] Create `src/components/budget/forecast-chart.tsx`. Props: `baseMonths: ForecastMonth[]`, `scenarioMonths: ForecastMonth[]`, `scenarioActive: boolean`, `annualGoal: number`, `currency: string`. Use Recharts `<ResponsiveContainer height={200}><LineChart>`. Build the data array as one point per month (x = month abbreviation). Plot three possible lines: (1) `actual` — solid warm amber, cumulative from `baseMonths` where `isActual === true`; (2) `projected` — dashed, lighter amber, cumulative from `baseMonths` for non-actual months — **the base projection, without scenario**; (3) `scenarioLine` — dashed, blue accent `oklch(0.6 0.15 250)`, cumulative from `scenarioMonths`, shown only when `scenarioActive` is true (this is why both series are passed — with one series the base and scenario lines would be identical). Add `<ReferenceLine y={annualGoal}>` with a "Goal €X" label at the right edge if `annualGoal > 0`. X-axis: 3-letter month names, no gridlines. Y-axis: currency-formatted, 3 ticks, no gridlines. Tooltip: shows all active lines at hovered month, currency formatted. No legend — direct line labels at line endpoints. Add this chart above `<ForecastTable>` in `budget-forecast.tsx`.

---

## Phase 4 — Scenario Panel (US3)

> Depends on Phase 2. Can run in parallel with Phase 3.

- [x] T009 [P] [US3] Create `src/components/budget/scenario-panel.tsx`. Props: `scenario: Scenario`, `onChange: (s: Scenario) => void`, `currency: string`. Card with heading "What If" and "Clear" text button top-right. Two side-by-side inputs (stacked below `sm:` breakpoint): (1) One-time expense: `€` prefixed number input + month dropdown offering **current and future months only** (a scenario on a completed month is meaningless), mapping to "YYYY-MM" values; (2) Monthly adjustment: `€` prefixed number input + a `+/-` toggle button that flips the sign. Both inputs are controlled. Empty string means "not applied" (distinct from zero). Debounce `onChange` by 300ms. When any input has a value, add `border-l-4 border-amber-400` to the card to signal scenario is active. Wire `<ScenarioPanel>` into `budget-forecast.tsx` below `<ForecastTable>`.

---

## Phase 5 — Cell Overrides (US4)

> Inline edit is already scaffolded in T005. This task wires up the override state in the container and validates the round-trip.

- [x] T010 [P] [US4] Verify that `handleOverride` in `budget-forecast.tsx` (built in T006) correctly sets/clears `overrides` state, and that `computeForecast` respects the override for the targeted cell. If the override key `"YYYY-MM:income"` is set, the income value for that month must use the override instead of the computed value. Same for `fixedCosts` and `spending`. Savings and cumulative must recalculate downstream (already covered by test case (d) in T003 — this task verifies the UI round-trip). Walk through manually: override October income → verify October savings updates → verify November and December cumulative update. Fix any issues found.

---

## Phase 6 — Polish & Edge Cases

- [x] T011 Create `<ForecastSkeleton />` inside `budget-forecast.tsx`: a skeleton that mirrors the chart height (a gray rounded rect at 200px) and a simplified table skeleton (4 rows × 12 columns of gray pills). Show during the initial API fetch. Use the same `<Skeleton>` component used elsewhere in the app.

- [x] T012 Add empty state to `budget-forecast.tsx`: when `raw.recurringIncome === 0` and `Object.keys(raw.actuals).length === 0`, render an `<EmptyState>` with icon `Wallet`, title "No income data yet", description "Add your monthly income in the Income tab to see your year forecast.", and a CTA button "Add income" that switches the budget tab to `income` (pass down a `onSwitchTab` prop from `budget-page.tsx` or use a shared `useState`).

- [x] T013 Add "Based on X months of data" note below `<ForecastTable>` when `spendingMonthsUsed < 3`. Use muted small text: "Spending projection is based on {X} month{s} of history."

- [x] T014 Ensure the month navigator (ChevronLeft/Right) in `budget-page.tsx` is hidden when the active tab is `"forecast"`. The forecast always shows the current year — the navigator is irrelevant and would confuse users. Add `activeTab` state to `BudgetPage` and conditionally render the navigator.

- [x] T015 Verify all currency formatting uses the `currency` field from the API response (not hardcoded `€`). Format numbers with `Intl.NumberFormat` or a shared utility. Example: `€ 1,234` (symbol + space + number, 0 decimal places for whole amounts, 2 for amounts with cents).

- [x] T016 Run `npm run build` and fix any TypeScript errors introduced. Run `npm run test:run` — the new `budget-forecast.test.ts` suite and all existing tests must pass.

---

## Parallel Execution Map

After Phase 1 (T001–T004) and Phase 2 (T005–T007) are done, these can run in parallel:

| Track A | Track B | Track C |
|---|---|---|
| T008 (chart) | T009 (scenario panel) | T010 (override verification) |
| — | — | T011–T016 (polish) |

---

## Definition of Done

- [x] The Forecast tab appears in the Budget section and is navigable
- [x] 12-month cash flow table renders with correct actuals (completed months) and projections (current + future months)
- [x] Actual income matches what the Budget dashboard shows for the same months (recurring fill-in applied)
- [x] Savings figures exclude "Savings"/"Savings Withdrawal" category entries — putting money into savings never shows as spending
- [x] Savings trajectory chart shows actual + base projected lines, scenario line when active, and the goal reference (monthly target × 12)
- [x] What If panel recalculates the entire forecast instantly when inputs change
- [x] Clicking a projected cell opens an inline editor; the override updates savings and cumulative
- [x] Empty state shown when no income is configured
- [x] Loading skeleton shown while API data is fetching
- [x] `npm run build` passes and `npm run test:run` is green (including the new forecast suite)
- [x] No new linter errors introduced
