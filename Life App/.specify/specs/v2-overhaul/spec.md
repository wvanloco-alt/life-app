# Feature Specification: Life App v2 Overhaul

**Feature Branch**: `v2-overhaul`  
**Created**: 2026-03-06  
**Status**: Approved  
**Input**: User feedback after first real use of the application

## Summary

Eight changes based on real usage feedback: remove unused complexity (Sharpen the Saw, Overview), rename features for clarity (Fitness → Activities, Weekly → Monthly), enhance budget management (planned expenses, savings goals), and implement bidirectional activity logging between the Today tab and Activities tracker.

**Data safety**: No database reset required. All existing data is preserved. Only one column is dropped (`saw_dimension` on `activity_types`), which serves the feature being removed. All other schema changes are additive (new tables, new nullable columns).

---

## User Scenarios & Testing

### User Story 1 -- Remove Sharpen the Saw (Priority: P1)

As a user, I find the Sharpen the Saw tracking too complex and confusing. I want it removed from the app entirely so the interface is cleaner.

**Why this priority**: Removing unused complexity first reduces cognitive load and eliminates dead code before building new features.

**Independent Test**: After removal, no sidebar link, route, API endpoint, or UI reference to "Sharpen the Saw" or "sawDimension" should exist. Activity types and logs continue working normally.

**Acceptance Scenarios**:

1. **Given** the sidebar navigation, **When** I look at the menu items, **Then** "Sharpen the Saw" is not listed
2. **Given** the activity type form, **When** I create or edit an activity type, **Then** there is no "Saw Dimension" field
3. **Given** the analytics page, **When** I view weekly analytics, **Then** there is no Sharpen the Saw chart or breakdown
4. **Given** existing activity logs with sawDimension data, **When** I view them, **Then** they display normally (sawDimension is simply ignored)

---

### User Story 2 -- Remove Overview Section (Priority: P1)

As a user, the Overview dashboard adds little value. I want it removed and the home page changed to the Today tab.

**Why this priority**: Paired with Story 1 as a removal that cleans up the app.

**Independent Test**: Navigating to `/` redirects to `/today`. No Overview link in sidebar.

**Acceptance Scenarios**:

1. **Given** the app root URL `/`, **When** I navigate to it, **Then** I am redirected to `/today`
2. **Given** the sidebar, **When** I look at nav items, **Then** "Overview" is not listed

---

### User Story 3 -- Rename Fitness to Activities (Priority: P1)

As a user, "Fitness" is too narrow a label. I want it renamed to "Activities" so it clearly relates to all tracked activities (including non-physical ones like Reading, Meditation).

**Why this priority**: Naming clarity before building enhancements on top.

**Independent Test**: All references to "Fitness" in the UI are replaced with "Activities". Routes change from `/fitness` to `/activities`.

**Acceptance Scenarios**:

1. **Given** the sidebar, **When** I look at nav items, **Then** it says "Activities" (not "Fitness")
2. **Given** the Activities page, **When** I view the dashboard tab, **Then** the title says "Activities Dashboard" (not "Fitness Dashboard")
3. **Given** a bookmark to `/fitness`, **When** I navigate to it, **Then** I get a 404 (routes have moved to `/activities`)

---

### User Story 4 -- Body Metrics on Activities Dashboard (Priority: P2)

As a user, I want to see my latest body metrics (weight, VO2max, resting HR) prominently on the Activities Dashboard, not buried in a small card at the bottom.

**Why this priority**: Enhances an existing feature with minimal risk.

**Independent Test**: The Activities Dashboard shows a prominent body metrics section with latest values, trend arrows, and mini sparkline charts.

**Acceptance Scenarios**:

1. **Given** the Activities Dashboard tab, **When** I view it, **Then** body metrics are displayed prominently near the top (below summary stat cards)
2. **Given** body metrics with historical data, **When** I view the dashboard, **Then** I see trend arrows and sparkline charts for each metric
3. **Given** no body metrics data, **When** I view the dashboard, **Then** the section shows an appropriate empty state

---

### User Story 5 -- Weekly Activity Volume by Type (Priority: P2)

As a user, I want the volume chart renamed from "Weekly Training Volume" to "Weekly Activity Volume" since it tracks all activity types, not just training.

**Why this priority**: Simple rename, paired with Story 4.

**Independent Test**: Chart title reads "Weekly Activity Volume".

**Acceptance Scenarios**:

1. **Given** the Activities Dashboard, **When** I view the volume chart, **Then** the title says "Weekly Activity Volume"
2. **Given** activity logs for multiple types, **When** I view the chart, **Then** each activity type is shown as a separate stacked bar (already works, no change needed)

---

### User Story 6 -- Monthly Plan (Priority: P2)

As a user, I want the Weekly Plan converted to a Monthly Plan. I only want the month grid view (no week day-column view). The navigation selector should show month names (e.g., "March 2026") instead of week numbers.

**Why this priority**: Major UI rework but no schema changes. Existing data model supports this.

**Independent Test**: Route `/monthly-plan` shows a month grid. Navigation lets me switch between months. No week toggle button exists.

**Acceptance Scenarios**:

1. **Given** the Monthly Plan page, **When** I view it, **Then** I see a month grid with all days visible
2. **Given** the month navigator, **When** I click prev/next, **Then** it navigates by month and displays "March 2026", "April 2026", etc.
3. **Given** the Monthly Plan page, **When** I look at the view controls, **Then** there is no week/month toggle (month only)
4. **Given** scheduled activities for the month, **When** I view the grid, **Then** activities appear in the correct day cells
5. **Given** the Monthly Plan, **When** I click "Generate Schedule", **Then** it generates for the entire visible month
6. **Given** focus goals, **When** I select them, **Then** they apply at the week level (internal) but are managed from the month view

---

### User Story 7 -- Budget Goals and Planned Expenses (Priority: P3)

As a user, I want to set yearly budget goals and create planned future expenses (one-off costs I know about in advance, like Christmas, vacations, equipment). These planned expenses should appear in the yearly overview alongside fixed costs and actual spending. I also want the existing savings goal to be more accessible.

**Why this priority**: New feature requiring a new DB table and API routes. Medium complexity.

**Independent Test**: I can create planned expenses, see them in the yearly overview, and manage savings goals from a dedicated Budget Goals tab.

**Acceptance Scenarios**:

1. **Given** the Budget page, **When** I look at the tabs, **Then** there is a "Budget Goals" tab
2. **Given** the Budget Goals tab, **When** I view it, **Then** I see a savings goal section (editable) and a planned expenses list
3. **Given** the planned expenses list, **When** I add an expense (name, amount, month, category), **Then** it appears in the list
4. **Given** planned expenses for March, **When** I view the yearly overview bar chart, **Then** March includes a "Planned" bar segment
5. **Given** planned expenses, **When** I view the yearly summary table, **Then** there is a "Planned" column showing planned amounts per month
6. **Given** the savings goal, **When** I edit target and date, **Then** the progress bar updates based on actual savings vs target

---

### User Story 8 -- Bidirectional Activity Logging (Priority: P3)

As a user, when I log an activity in the Activities tracker, it should appear in my Today view. If there's a matching scheduled activity (same activity type and date), that scheduled activity should be auto-completed. The reverse should also work: I should be able to log activities from the Today tab, and they should appear in the Activities tracker.

**Why this priority**: Most architecturally complex change. Requires cross-component integration and schema additions.

**Independent Test**: Log an activity from Activities tab → it appears in Today view and auto-completes matching scheduled activity. Log from Today tab → it appears in Activities tracker.

**Acceptance Scenarios**:

1. **Given** a scheduled activity "Tennis" for today, **When** I log a Tennis activity in the Activities tab, **Then** the scheduled activity is auto-completed and linked to the log
2. **Given** no scheduled activity for today, **When** I log a Running activity in the Activities tab, **Then** the log appears in the Today view's "Completed Activities" section
3. **Given** the Today tab, **When** I click "Log Activity", **Then** a form opens to log an activity (activity type, duration, metrics)
4. **Given** a scheduled activity with an associated activity type, **When** I click on it in Today view, **Then** I see a "Log & Complete" action that pre-fills the log form
5. **Given** a logged activity from the Today tab, **When** I navigate to the Activities tracker, **Then** the logged activity appears in the activity log list

---

### Edge Cases

- What happens when a user logs an activity from Activities tab but there are multiple matching scheduled activities on the same day? → Complete the first uncompleted match.
- What happens when a planned expense is deleted? → It disappears from the yearly overview. No cascade effects.
- What happens when switching months in Monthly Plan and there are unsaved focus goal changes? → Focus goals are saved immediately on selection (existing behavior).
- What if the `saw_dimension` column cannot be dropped? → Leave it in the DB, just remove from code. No functional impact.

---

## Requirements

### Functional Requirements

**Removals:**
- **FR-001**: System MUST remove all Sharpen the Saw UI, routes, API endpoints, and `sawDimension` references from code
- **FR-002**: System MUST drop `saw_dimension` column from `activity_types` table
- **FR-003**: System MUST remove all Overview UI, routes, API endpoints, and related types
- **FR-004**: System MUST redirect `/` to `/today`

**Renames:**
- **FR-005**: System MUST rename all "Fitness" references to "Activities" (route, components, sidebar, API)
- **FR-006**: System MUST rename route `/fitness` to `/activities` and `/api/fitness/summary` to `/api/activities/summary`

**Dashboard Enhancements:**
- **FR-007**: Activities Dashboard MUST display body metrics prominently near the top with trend arrows and sparkline charts
- **FR-008**: Volume chart title MUST read "Weekly Activity Volume" (not "Weekly Training Volume")

**Monthly Plan:**
- **FR-009**: System MUST convert Weekly Plan to Monthly Plan with month-only grid view
- **FR-010**: Month navigator MUST display month names (e.g., "March 2026") and navigate by month
- **FR-011**: Route MUST change from `/weekly-plan` to `/monthly-plan`
- **FR-012**: Week/month toggle MUST be removed (month view only)

**Budget Goals:**
- **FR-013**: System MUST provide a `plannedExpenses` table with name, amount, month, optional category, and notes
- **FR-014**: Budget page MUST have a "Budget Goals" tab with savings goal management and planned expenses CRUD
- **FR-015**: Yearly overview (bar chart and table) MUST include planned expenses alongside income, fixed costs, and spending
- **FR-016**: Budget summary API MUST return planned expenses for the queried month

**Activity Logging:**
- **FR-017**: System MUST add `activityTypeId` (nullable FK) to `activities` table for direct matching
- **FR-018**: Today view MUST display activity logs for the current day alongside scheduled activities
- **FR-019**: Today tab MUST offer a "Log Activity" button that creates an activity log entry
- **FR-020**: When an activity log is created, system MUST auto-complete any matching scheduled activity (same `activityTypeId`, same date, not yet completed)
- **FR-021**: Scheduled activities with an associated activity type MUST offer a "Log & Complete" action
- **FR-022**: Activity log API `GET /api/activity-logs` MUST support `?date=YYYY-MM-DD` filter

### Key Entities

**Modified Entities:**
- **ActivityType**: Remove `sawDimension` field
- **Activity**: Add optional `activityTypeId` FK for direct matching with activity logs
- **WeeklyAnalytics**: Remove `sharpenTheSaw` field

**New Entity:**
- **PlannedExpense**: One-off future expense with `id`, `name`, `amount`, `month` (YYYY-MM), optional `categoryId` (FK → SpendingCategory), `notes`, timestamps

**Removed Entities:**
- **SawDimension** type
- **BodyZone**, **ZoneStatus**, **ZoneId**, **GoalStreak**, **RoleStreak**, **OverviewData** types

---

## Schema Changes

### Drop column
```sql
ALTER TABLE activity_types DROP COLUMN saw_dimension;
```

### New table
```sql
CREATE TABLE planned_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  month TEXT NOT NULL,           -- YYYY-MM format
  category_id INTEGER REFERENCES spending_categories(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### New column
```sql
ALTER TABLE activities ADD COLUMN activity_type_id INTEGER REFERENCES activity_types(id);
```

---

## API Changes

### Removed endpoints
- `GET /api/sharpen-the-saw`
- `GET /api/overview`

### Renamed endpoints
- `GET /api/fitness/summary` → `GET /api/activities/summary`

### Modified endpoints
- `GET /api/activity-logs` -- add `?date=YYYY-MM-DD` filter
- `POST /api/activity-logs` -- after creating, auto-complete matching scheduled activity
- `GET /api/analytics` -- remove `sharpenTheSaw` from response
- `GET /api/analytics/trends` -- remove saw trend data
- `GET /api/activity-types` -- remove `sawDimension` from response
- `POST /api/activity-types` -- remove `sawDimension` from request
- `PATCH /api/activity-types/:id` -- remove `sawDimension` from request
- `GET /api/budget/summary` -- add `plannedExpenses` to response

### New endpoints
- `GET /api/planned-expenses?year=YYYY` -- list planned expenses for a year
- `POST /api/planned-expenses` -- create planned expense
- `PATCH /api/planned-expenses/[id]` -- update planned expense
- `DELETE /api/planned-expenses/[id]` -- delete planned expense

---

## Navigation (final sidebar order)

1. Monthly Plan (`/monthly-plan`)
2. Today (`/today`) -- home page
3. Goals (`/goals`)
4. Roles (`/roles`)
5. Mission (`/mission`)
6. Analytics (`/analytics`)
7. Activities (`/activities`)
8. Activity Types (`/activity-types`)
9. Budget (`/budget`)

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 9 sidebar items render correctly with working links
- **SC-002**: No references to "Sharpen the Saw", "Fitness" (as feature name), "Overview", or "Weekly Plan" in the UI
- **SC-003**: Existing activity logs, scheduled activities, budget data, goals, and roles are fully accessible after migration
- **SC-004**: Planned expenses appear in the yearly overview bar chart and summary table
- **SC-005**: Logging an activity from Activities tab auto-completes a matching scheduled activity in the Today view
- **SC-006**: Logging an activity from the Today tab creates an entry visible in the Activities tracker
- **SC-007**: Month navigator shows month names and navigates by month (not week)
- **SC-008**: Body metrics are visible on the Activities Dashboard without navigating to a separate tab
