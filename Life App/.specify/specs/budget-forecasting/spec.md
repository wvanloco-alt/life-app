# Feature Specification: Budget Forecasting

**Feature**: `budget-forecasting`  
**Created**: 2026-08-12  
**Status**: Implemented  
**Branch**: `life-app-2.0`

---

## Why This Exists

The current budget tab is a daily spending tracker. The user stopped using it because daily expense entry is a chore, not a habit. But the underlying data (income, fixed costs, savings goal, spending history) is valuable — it just needs a different presentation mode.

The core insight: **the user doesn't need to track every coffee, they need to know once a month if they're on track to hit their savings goal for the year.** A forecasting surface turns what's already in the database into a forward-looking financial picture. No new data entry required to get value.

Usage cadence: 2–4 sessions per year. A "state of finances" review at quarter end, before a big purchase, or when income changes.

---

## User Scenarios & Testing

### User Story 1 — Year-at-a-Glance Cash Flow (Priority: P1)

The user opens the Budget tab and navigates to "Forecast." They see a 12-column table, one column per month, showing projected income, projected fixed costs, projected spending (from historical average), and resulting projected savings for each month. Past months show actuals; future months show projections. The final row shows cumulative savings by December.

**Why this priority**: This is the core value — turning existing data into a forward-looking picture without any new input. Everything else builds on this.

**Independent Test**: Can be tested fully by opening the Forecast tab and verifying that the 12-month table renders correctly with data derived from existing income entries, fixed costs, and spending history. Delivers the "am I on track?" answer without any interaction.

**Acceptance Scenarios**:

1. **Given** the user has income entries and fixed costs logged, **When** they open the Forecast tab, **Then** the 12-month cash flow table renders with income, fixed costs, spending, and savings rows for every month of the current year.
2. **Given** past months have actual spending logged, **When** the table renders, **Then** past months show actual figures and future months show projected figures (labeled distinctly — e.g., faded, italic, or labeled "proj.").
3. **Given** the user has a savings goal set in budget settings, **When** the table renders, **Then** the savings row highlights months where projected savings fall short of the monthly target.
4. **Given** no income entries exist, **When** the Forecast tab opens, **Then** an empty state guides the user to add their income in the Income tab first.

---

### User Story 2 — Savings Trajectory Chart (Priority: P2)

The user sees a line chart below the cash flow table. It shows two lines: cumulative actual savings (from logged spending entries) and the cumulative projected savings trajectory. The user's yearly savings goal is shown as a horizontal reference line. The chart makes it immediately clear whether they are ahead of or behind their savings goal.

**Why this priority**: The table gives the details; the chart gives the instant emotional read — "am I on track?" A single glance is all that should be needed.

**Independent Test**: Can be tested by verifying the chart renders with at minimum a goal reference line and a projected trajectory line, using the savings target from budget settings.

**Acceptance Scenarios**:

1. **Given** a savings goal is set, **When** the chart renders, **Then** a horizontal dashed line shows the yearly savings goal.
2. **Given** past spending is logged, **When** the chart renders, **Then** the "actual" line plots cumulative savings month by month for past months.
3. **Given** future months have no actual data, **When** the chart renders, **Then** the projected line continues from the last actual data point to December, using the monthly spending average.
4. **Given** the projected line crosses the goal line before December, **When** the user reads the chart, **Then** a subtle annotation indicates the month when the goal is expected to be reached.

---

### User Story 3 — Scenario Planning ("What If") (Priority: P3)

The user wants to know what happens to their annual savings if they spend €500 on a holiday next month, or €200 more per month on variable expenses. A "What If" panel lets them enter a one-time expense or a recurring monthly adjustment. The cash flow table and savings chart update instantly to reflect the scenario.

**Why this priority**: This is the "aha moment" feature — modeling a decision before making it. But it's useless without the base forecast (P1) and trajectory (P2).

**Independent Test**: Can be tested by entering a one-time expense amount in the scenario panel and confirming the cash flow table updates in that month, the cumulative savings decrease accordingly, and the chart trajectory adjusts.

**Acceptance Scenarios**:

1. **Given** the forecast is loaded, **When** the user enters a one-time expense amount and selects a month, **Then** the cash flow table deducts that amount from the selected month's projected savings and all subsequent cumulative totals.
2. **Given** the forecast is loaded, **When** the user adjusts the "monthly spending adjustment" slider or input, **Then** all future months' spending rows and savings rows update instantly without a page reload.
3. **Given** a scenario is active, **When** the chart renders, **Then** it shows a second "scenario" trajectory line in a distinct color alongside the base projection.
4. **Given** a scenario is active, **When** the user clears the scenario panel, **Then** the forecast returns to the base projection immediately.

---

### User Story 4 — Manual Projection Overrides (Priority: P4)

The user knows their income will change in October (bonus, salary raise, contract end). They want to override the October income projection directly in the table. Clicking any projected cell in the cash flow table opens an inline edit. The change is applied only to that specific month's projection (not persisted permanently — it's a session override).

**Why this priority**: Scenario modeling for known income/expense changes. Important for completeness, but only needed when the user's situation differs from the historical average.

**Independent Test**: Can be tested by clicking a projected month's income cell and entering a custom value. The savings for that month and all subsequent cumulative figures should update instantly.

**Acceptance Scenarios**:

1. **Given** a future month's income cell is clicked, **When** the user enters a value, **Then** the table recalculates that month's savings and all downstream cumulative savings.
2. **Given** a cell has been manually overridden, **When** the user clears it, **Then** the cell reverts to its computed projection.
3. **Given** a manual override is active, **When** the user navigates away and returns, **Then** the override is cleared (session-only, not persisted).
4. **Given** a past month's cell is shown, **When** the user attempts to click it, **Then** it is not editable (past actuals are read-only).

---

### Edge Cases

- What happens when the user has no income entries? → Empty state with a link to add income.
- What if spending history is less than 3 months? → Use available data with a note: "Based on X months of history."
- What if fixed costs have a date range that doesn't cover all months? → Only include the cost in months where it is active.
- What if the savings goal is not set? → The goal reference line is hidden; a subtle nudge to set one.
- What if the current month is January (no completed months)? → All 12 months show as projected.
- What if the current month is December? → 11 completed months show actuals; December is projected like any current month (from the spending average of the last 3 completed months).

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST display a year-at-a-glance cash flow table with 12 columns (one per month of the current year) and at minimum 4 rows: projected income, projected fixed costs, projected spending, and projected savings.
- **FR-002**: Completed months MUST display actual figures sourced from logged income and spending entries. The current (in-progress) month and future months MUST display projections clearly distinguished from actuals — a partial month shown as "actual" would read as a false surplus.
- **FR-003**: Projected monthly spending MUST default to the rolling average of actual spending from the most recent 3 **completed** months (or all available completed months if fewer exist).
- **FR-003a**: Actual income for completed months MUST be resolved the same way the existing budget summary resolves income: explicit income entries for that month, plus recurring income entries (deduped by source, keeping the most recent) for sources with no explicit entry that month. Explicit-entries-only would show near-zero income for users who rely on recurring income.
- **FR-003b**: The forecast MUST exclude the "Savings" and "Savings Withdrawal" special categories from the spending row and exclude "Savings"-category fixed costs from the fixed-costs row. In this app those entries *are* savings contributions/withdrawals (see `/api/budget/summary`), not consumption — counting them as spending would understate savings by exactly the amount saved. The savings row is the residual: income − fixed costs − spending, with these exclusions applied.
- **FR-004**: The system MUST display a savings trajectory line chart showing cumulative actual savings (past months) and cumulative projected savings (future months) plotted across the full year.
- **FR-005**: The yearly savings goal MUST be displayed as a reference line on the chart when set. The yearly goal is defined as `monthly_savings_target × 12` (decided 2026-08-12 — not `savings_goal_total`, which is a multi-year total measured against a different baseline).
- **FR-006**: The "What If" scenario panel MUST allow the user to enter (a) a one-time expense with a month selector (current and future months only — modifying a completed month is meaningless) and (b) a recurring monthly spending adjustment (positive or negative).
- **FR-007**: All scenario inputs MUST recalculate the cash flow table and chart trajectory instantly (no save/apply button required).
- **FR-008**: The scenario panel MUST include a "Clear scenario" action that restores the base projection.
- **FR-009**: Future month cells MUST be individually overridable via inline editing. Past month cells MUST be read-only.
- **FR-010**: Cell overrides MUST be session-only and MUST NOT be persisted to the database.
- **FR-011**: The forecast view MUST be accessible as a new tab inside the existing Budget section, requiring no navigation outside the Budget page.
- **FR-012**: The forecast calculation MUST correctly handle fixed costs that are inactive (outside their active date range) for a given month.
- **FR-013**: The system MUST show an empty state with actionable guidance when no income entries exist.
- **FR-014**: All monetary amounts MUST display in the user's configured currency (EUR by default).

### Key Entities

- **Cash Flow Row**: A single row in the projection table. Has a type (income / fixed costs / spending / savings), a label, and 12 monthly values (actual or projected).
- **Month Cell**: A single cell in the cash flow table. Has a value, a source (actual or projected), and an optional override state.
- **Scenario**: A temporary, session-only modifier consisting of an optional one-time expense (amount + month) and an optional monthly spending delta. Applied on top of the base projection.
- **Savings Trajectory**: A derived time series of cumulative savings per month, computed from the base projection or the active scenario.

---

## UI Design Specification

This section specifies the visual design and interaction patterns. It is part of the spec because the design significantly influences what gets built.

### Layout

The Forecast tab lives inside the existing Budget page tab strip, between "Dashboard" and "Log Spending." It has two vertical sections:

1. **Savings Trajectory Chart** — top, full width, approximately 220px tall
2. **Cash Flow Table** — below the chart, full width, horizontally scrollable on narrow viewports
3. **Scenario Panel** — below the table, a card with 2–3 inputs

No sidebars. Single-column, stacked layout, generous vertical whitespace.

### Cash Flow Table

```
         Jan    Feb    Mar    Apr    May    Jun    Jul    Aug    Sep    Oct    Nov    Dec
Income   €3200  €3200  €3200  proj.  proj.  proj.  proj.  proj.  proj.  proj.  proj.  proj.
Fixed    -€1100 -€1100 -€1100 proj.  proj.  proj.  proj.  proj.  proj.  proj.  proj.  proj.
Spending -€1420 -€1380 -€1290 proj.  proj.  proj.  proj.  proj.  proj.  proj.  proj.  proj.
─────────────────────────────────────────────────────────────────────────────────────────
Savings    €680   €720   €810  proj.  proj.  proj.  proj.  proj.  proj.  proj.  proj.  proj.
Cumul.    €680  €1400  €2210  proj.  ...
```

**Design rules:**
- Row headers use the body font (Plus Jakarta Sans), left-aligned in a fixed 120px column
- Past month values: normal weight, full opacity
- Projected values: slightly muted (70% opacity), with a subtle italic or "proj." micro-label
- The Savings row is separated by a full-width divider line and uses the display font (Fraunces) for values
- The Cumulative Savings row uses a warm accent color (`--palette-amber`) for positive values
- Negative months (spending exceeds income) are flagged with a muted red tint — not aggressive, just informative
- Months that fall short of the monthly savings target get a subtle amber dot indicator
- Current month column has a warm background tint to orient the user

**Editable cells:**
- Projected cells show a faint edit icon on hover
- Clicking opens the cell in an inline input (borderless, full-cell width, auto-focused)
- Tab moves to the next editable cell in the same row
- Escape cancels the edit
- Enter or blur confirms
- Overridden cells show a small indicator dot (to signal "this is manually overridden, not computed")

### Savings Trajectory Chart

- Recharts `LineChart`, full width, 200px height
- Two lines: **Actual** (solid, warm amber) and **Projected** (dashed, same color but lighter)
- Scenario line (when active): dashed, in a distinct accent color (`--palette-blue` or similar)
- Goal reference: horizontal dashed line, labeled "Goal €X" at the right edge
- X-axis: month abbreviations (Jan–Dec)
- Y-axis: currency formatted, minimal tick count (3–4), no gridlines except horizontal
- Tooltip on hover: shows values for all active lines at that month
- No legend — lines are labeled directly with a small annotation at their endpoints
- The chart is read-only; no click-to-edit

### Scenario Panel

A card below the table with a heading "What If" and two inputs side by side:

```
┌─────────────────────────────────────────────────────────────┐
│ What If                                              [Clear] │
│                                                              │
│  One-time expense         Monthly adjustment                 │
│  [€ ______] in [Month ▾]  [€ ______] more/less per month   │
└─────────────────────────────────────────────────────────────┘
```

**Data entry best practices applied here:**
- **Prefix indicator**: `€` symbol displayed inside the input, left-aligned, so the user only types the number
- **Month selector**: a compact dropdown (not a date picker — months are the right granularity here)
- **Positive/negative**: the monthly adjustment accepts a signed number; a `+/-` toggle button to the left of the input is clearer than asking users to type `-`
- **Instant feedback**: no submit button — the forecast recalculates on every keystroke (debounced 300ms)
- **Empty = neutral**: empty scenario inputs mean "no scenario applied" — zero is distinct from empty
- **Clear button**: top-right of the panel, text only (`Clear`), removes both inputs and restores base projection
- **Visual confirmation**: when a scenario is active, the panel gets a subtle amber left border to signal "you are viewing a modified forecast"

### Typography and Color

- Section heading "Budget Forecast" in Fraunces, 20px
- Table row headers: Plus Jakarta Sans 14px, muted color
- Table values: JetBrains Mono 13px (data values deserve the monospace treatment for alignment)
- Projected values: 70% opacity of the base text color
- Savings amounts (positive): warm amber `--palette-amber-11`
- Savings amounts (negative / shortfall): muted red `oklch(0.55 0.15 25)`
- Scenario panel: `bg-card`, rounded `0.625rem`, `border border-border`

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: The Forecast tab loads and displays the full 12-month table in under 1 second after navigating to it.
- **SC-002**: Updating a scenario input reflects changes in the cash flow table and chart in under 400ms (debounced calculation, not a network round-trip).
- **SC-003**: A user with no prior budget knowledge can answer "am I on track to hit my savings goal?" by reading the forecast view in under 30 seconds without any help.
- **SC-004**: The forecast calculation correctly incorporates fixed costs with active date ranges — a fixed cost ending in June does not appear in July–December projections.
- **SC-005**: Clearing the scenario panel restores the exact base projection values with no residual state.
- **SC-006**: The feature requires zero new data entry for a user who already has income and fixed costs configured.

---

## Assumptions

1. **No new tables.** The forecast is fully derived from `income_entries`, `fixed_costs`, `spending_entries`, `budget_settings`, and `planned_expenses`. Zero schema changes.
2. **Current year only.** The forecast always covers Jan–Dec of the current calendar year. Prior-year forecasting is out of scope.
3. **Single user's data.** The forecast is scoped per authenticated user, like all other budget routes.
4. **Spending average = all categories combined**, except the "Savings" and "Savings Withdrawal" special categories (see FR-003b). The projection does not break down spending by category — it uses total monthly spending from the last 3 completed months. Category-level forecasting is out of scope.
4b. **The current month is always a projection.** "Actual" means completed months only. A month in progress projects from the spending average like future months do (decided 2026-08-12).
5. **Planned expenses are additive.** One-off costs from `planned_expenses` are included in the month they are scheduled, on top of the projected spending average.
6. **Income projection = most recent recurring income entries.** Non-recurring income entries are included only in the months they were logged (actuals), not projected forward.
7. **Session-only cell overrides.** Overrides reset on page refresh. Persisting overrides is out of scope — they are for in-session modeling only.

---

## Out of Scope

- Multi-year forecasting
- Category-level spending breakdown in the forecast
- Persisting scenario or override state across sessions
- AI-based spending predictions
- Bank/transaction sync (Plaid, Nordigen)
- Exporting the forecast to PDF or CSV

---

## Open Questions

None. Ready to proceed to planning.
