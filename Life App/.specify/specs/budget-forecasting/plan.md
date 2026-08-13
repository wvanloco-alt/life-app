# Implementation Plan: Budget Forecasting

**Feature**: `budget-forecasting`  
**Created**: 2026-08-12  
**Branch**: `life-app-2.0`  
**Spec**: `.specify/specs/budget-forecasting/spec.md`

---

## Technical Context

### What already exists

| Asset | Location | Reuse |
|---|---|---|
| Budget page with tabs | `src/components/budget/budget-page.tsx` | Add a "Forecast" tab |
| Budget summary API | `src/app/api/budget/summary/route.ts` | Reference for data access patterns |
| `incomeEntries`, `fixedCosts`, `spendingEntries`, `plannedExpenses`, `budgetSettings` | `src/db/schema.ts` | All required data is already stored |
| `budget-computations.ts` | `src/lib/budget-computations.ts` | Pattern to follow for pure functions |
| Recharts | Already installed | Use for trajectory chart |
| date-fns | Already installed | Month arithmetic |

### What is new

| Asset | Location | Purpose |
|---|---|---|
| Forecast API | `src/app/api/budget/forecast/route.ts` | Aggregates all forecast data in one request |
| Forecast pure library | `src/lib/budget-forecast.ts` | Projection logic (no I/O, fully testable) |
| Forecast tests | `src/lib/__tests__/budget-forecast.test.ts` | Vitest coverage of the pure projection logic (required — testing conventions mandate tests for pure functions) |
| `BudgetForecast` component | `src/components/budget/budget-forecast.tsx` | Container, handles fetch + scenario state |
| `ForecastTable` component | `src/components/budget/forecast-table.tsx` | 12-month grid with editable cells |
| `ForecastChart` component | `src/components/budget/forecast-chart.tsx` | Recharts savings trajectory |
| `ScenarioPanel` component | `src/components/budget/scenario-panel.tsx` | "What If" inputs |

**Schema changes: none.** Zero new tables, zero new columns.

---

## Architecture

### Data flow

```
budget-page.tsx
  └─ <BudgetForecast />                        (new tab)
       ├─ useEffect → GET /api/budget/forecast  (fetch once on mount)
       ├─ computeForecast(data, overrides)       (pure → baseMonths)
       ├─ computeScenario(base, scenario)        (pure → scenarioMonths)
       │
       ├─ <ForecastChart baseMonths={...}        (Recharts, read-only —
       │       scenarioMonths={... | null} />     needs BOTH series to draw
       │                                          base vs. scenario lines)
       ├─ <ForecastTable months={displayMonths}  (grid, cell overrides bubble up)
       │       overrides={overrides}              (per-cell override indicator)
       │       onOverride={handleOverride} />
       └─ <ScenarioPanel                         (controlled inputs)
               scenario={scenario}
               onChange={setScenario} />
```

### State model (all in `BudgetForecast`)

```typescript
// Raw data from API — fetched once, never mutated
const [raw, setRaw] = useState<ForecastPayload | null>(null);

// Session-only cell overrides: key = "YYYY-MM:rowType", value = number
const [overrides, setOverrides] = useState<Record<string, number>>({});

// What-if scenario inputs
const [scenario, setScenario] = useState<Scenario>({ oneTimeExpense: null, monthlyDelta: 0 });

// Derived — base and scenario kept as SEPARATE series so the chart
// can plot "base projection" vs "scenario" (identical when no scenario active)
const baseMonths = useMemo(
  () => raw ? computeForecast(raw, overrides) : [],
  [raw, overrides]
);
const scenarioMonths = useMemo(
  () => computeScenario(baseMonths, scenario),
  [baseMonths, scenario]
);
// Table and chart display the scenario series; chart additionally receives baseMonths
```

**Yearly goal**: derived in the container as `raw.monthlySavingsTarget * 12` (decided 2026-08-12 — not `savings_goal_total`, which is a multi-year total measured against a contributions-based baseline). No extra payload field needed.

The forecast is pure client-side computation. No "save" button, no debounced API call. The API is called once on mount; all modeling happens in memory.

---

## API Contract: `GET /api/budget/forecast`

**Auth**: required.  
**Query params**: none (always current year).

**Response** `200`:

```typescript
interface ForecastPayload {
  year: number;                        // e.g. 2026
  currency: string;                    // e.g. "EUR"
  monthlySavingsTarget: number;        // from budget_settings
  savingsStartingBalance: number;      // from budget_settings (default 0)

  // Actual monthly totals for COMPLETED months only (keyed "YYYY-MM").
  // The current in-progress month is never an actual — it projects like future months.
  // income = explicit entries + recurring fill-in per source (same resolution as
  //          /api/budget/summary, lines 43-56 — explicit-only would show ~€0 for
  //          users who rely on recurring income)
  // spending EXCLUDES "Savings" and "Savings Withdrawal" categories (those are
  //          savings contributions, not consumption — see summary route)
  // fixedCosts EXCLUDES "Savings"-category costs (same reason) and inactive costs
  actuals: Record<string, MonthActuals>;

  // All recurring income (used to project future months)
  recurringIncome: number;             // sum of is_recurring=true income entries, deduped by source (most recent)

  // Active fixed costs per month (keyed "YYYY-MM" → total), is_active=true only,
  // respecting start/end month ranges, excluding "Savings" category
  fixedCostsByMonth: Record<string, number>;

  // Average monthly spending (last 3 COMPLETED months, or all available completed months)
  spendingAverage: number;
  spendingMonthsUsed: number;          // how many months went into the average

  // One-off planned expenses (keyed "YYYY-MM" → total)
  plannedExpensesByMonth: Record<string, number>;
}

interface MonthActuals {
  income: number;
  fixedCosts: number;
  spending: number;
  savings: number;                     // income - fixedCosts - spending
}
```

---

## Pure Library: `src/lib/budget-forecast.ts`

Three exported functions:

```typescript
// Build ForecastMonth[] for all 12 months of the year
export function computeForecast(
  payload: ForecastPayload,
  overrides: Record<string, number>   // "YYYY-MM:income" | "YYYY-MM:spending" etc.
): ForecastMonth[]

// Apply a what-if scenario on top of the base forecast.
// oneTimeExpense ADDS to the targeted month's spending (reducing savings);
// monthlyDelta ADDS to every non-actual month's spending.
// Never modifies actual (completed) months.
export function computeScenario(
  base: ForecastMonth[],
  scenario: Scenario
): ForecastMonth[]

// Derive cumulative savings series from ForecastMonth[]
export function computeTrajectory(months: ForecastMonth[]): number[]
```

```typescript
interface ForecastMonth {
  month: string;          // "YYYY-MM"
  isActual: boolean;      // true for COMPLETED months only — current month is projected
  income: number;
  fixedCosts: number;
  spending: number;
  savings: number;        // income - fixedCosts - spending
  cumulative: number;     // running total from savingsStartingBalance
  shortfall: boolean;     // savings < monthlySavingsTarget
  hasOverride: boolean;   // any cell in this month is manually overridden
}

interface Scenario {
  oneTimeExpense: { amount: number; month: string } | null;
  monthlyDelta: number;   // positive = spend more, negative = spend less
}
```

---

## Component Design

### `ForecastTable`

- Receives the `overrides` map alongside `months` — a month-level `hasOverride` flag can't place the indicator dot on the right cell
- `<table>` with sticky first column (row labels)
- 4 data rows: Income, Fixed Costs, Spending, Savings
- 1 summary row: Cumulative Savings
- Current month column: warm background tint via `bg-amber-50/50 dark:bg-amber-950/20`
- Past months: normal opacity
- Future months: `opacity-70 italic` with "proj." micro-label in the column header
- Savings row: separated by `border-t-2`, values in Fraunces font
- Shortfall cells: `text-red-500/70` (muted, not aggressive)
- Editable cells (future months only): `cursor-pointer hover:bg-muted/50`, pencil icon on hover
- Inline edit state: `<input>` replaces cell content, auto-selects on focus, confirms on blur/Enter, cancels on Escape

### `ForecastChart`

- `<ResponsiveContainer width="100%" height={200}>`
- `<LineChart>` with three possible lines (props: `baseMonths`, `scenarioMonths`, `scenarioActive`):
  - `actual` — solid, `--palette-amber` color, cumulative from `baseMonths` where `isActual`
  - `projected` — dashed, same color lighter, cumulative from `baseMonths` for non-actual months (the BASE projection, without scenario)
  - `scenarioProjected` — dashed, distinct accent (e.g. `oklch(0.6 0.15 250)`), cumulative from `scenarioMonths`, only when scenario is active — this is why the chart needs both series; with one series the base and scenario lines would be identical
- Goal reference: `<ReferenceLine y={annualGoal} stroke="..." strokeDasharray="4 2" label="Goal" />` where `annualGoal = monthlySavingsTarget × 12`, hidden when the target is 0
- X-axis: month abbreviations, no gridlines
- Y-axis: `€` formatted, 3 ticks
- Tooltip: currency formatted, shows all active lines

### `ScenarioPanel`

- Card with `border-l-4` that becomes amber when scenario is active
- Two inputs side by side on desktop, stacked on narrow:
  1. **One-time expense**: `€` input + month dropdown (current and future months only — a scenario on a completed month is meaningless)
  2. **Monthly adjustment**: `€` input + `+/-` toggle button
- "Clear" text button top-right
- Both inputs are uncontrolled until user types (empty = not applied)
- 300ms debounce on keystroke before recalculating

---

## Implementation Phases

### Phase 1 — Pure library + tests + API (no UI)
`budget-forecast.ts` + `budget-forecast.test.ts` + `GET /api/budget/forecast`  
The projection math is the riskiest part of the feature (month boundaries, fixed-cost ranges, override/scenario stacking) — it gets Vitest coverage before any UI exists. Testable by running the tests and calling the API.

### Phase 2 — Cash flow table (US1)
`ForecastTable` + `BudgetForecast` container wired into `budget-page.tsx`.  
MVP checkpoint: 12-month table renders with correct actuals and projections.

### Phase 3 — Savings trajectory chart (US2)
`ForecastChart` added to `BudgetForecast` above the table.

### Phase 4 — Scenario panel (US3)
`ScenarioPanel` + scenario state in `BudgetForecast`.

### Phase 5 — Cell overrides (US4)
Inline edit in `ForecastTable` + override state in `BudgetForecast`.

### Phase 6 — Polish
Empty state, loading skeleton, edge cases, typography pass.

---

## Constitution Check

| Constraint | Status |
|---|---|
| No new tables | ✅ Zero schema changes |
| Auth on every route | ✅ `auth()` called first in forecast route |
| User scoping | ✅ All queries filter `WHERE user_id = session.user.id` |
| Local state only | ✅ No Redux/Zustand — all state in `BudgetForecast` via `useState`/`useMemo` |
| REST API | ✅ `GET /api/budget/forecast` |
| Pure business logic in `src/lib/` | ✅ Projection math in `budget-forecast.ts` |
| Tests for pure functions (testing conventions) | ✅ `src/lib/__tests__/budget-forecast.test.ts` in Phase 1 |
| No mobile | ✅ Table is desktop-first (horizontal scroll on narrow) |
| Simplicity | ✅ One API call, all modeling in memory, no persistence complexity |
