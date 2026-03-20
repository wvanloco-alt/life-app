# API Routes Contract: Life App

> Last updated: 2026-03-21. Reflects current API surface including Feature 1, Feature 2 (Activities), Feature 3 (Budget), v2 Overhaul, Goals V2 (goal hierarchy, tallies, pace tracking), Scheduler Rules (blackout dates, session patterns, activity type propagation), schedule regeneration/reset, and UI Design Overhaul (cascade delete, activity summary extension). Onboarding Wizard removed.

All API routes use Next.js Route Handlers. Base URL: `http://localhost:3000/api`

All responses are JSON. All dates are ISO 8601 format.

---

## Activity Types

Activity types define trackable activities (e.g., Running, Tennis, Reading, Meditation).

### GET /api/activity-types

Returns all activity types.

**Response** `200`:
```json
[
  {
    "id": 1,
    "name": "Running",
    "type": "cardio",
    "icon": "🏃",
    "isTracked": true,
    "defaultCalories": null,
    "defaultSteps": null,
    "metricsConfig": [
      { "key": "distance_km", "label": "Distance (km)", "type": "number" },
      { "key": "pace", "label": "Pace (min/km)", "type": "text" }
    ],
    "variants": null,
    "createdAt": "2026-03-04T12:00:00.000Z",
    "updatedAt": "2026-03-04T12:00:00.000Z"
  }
]
```

### POST /api/activity-types

Create a new activity type.

**Request body**:
```json
{
  "name": "Meditation",
  "type": "mindfulness",
  "icon": "🧘",
  "isTracked": true,
  "defaultCalories": null,
  "defaultSteps": null,
  "metricsConfig": [],
  "variants": null
}
```

**Response** `201`: The created activity type object.

### PATCH /api/activity-types/:id

Update an activity type. Accepts any subset of fields.

### DELETE /api/activity-types/:id

Delete an activity type.

---

## Activity Logs

Activity logs replace the former Workouts entity. They record completed activities and can optionally link to goals and calendar entries.

### GET /api/activity-logs

Returns activity logs with joined `activityTypeName`, `activityTypeIcon`. Accepts query params:
- `?activityTypeId=1` — filter by activity type
- `?date=YYYY-MM-DD` — filter by exact date (v2)
- `?from=YYYY-MM-DD` / `?to=YYYY-MM-DD` — date range
- `?limit=100` — max results (default 100)

**Response** `200`:
```json
[
  {
    "id": 1,
    "activityTypeId": 1,
    "goalId": 1,
    "activityId": 5,
    "date": "2026-03-04",
    "durationMinutes": 45,
    "calories": 380,
    "steps": null,
    "variant": null,
    "metrics": { "distance_km": 5.2, "pace": "5:30", "heart_rate": 155 },
    "notes": "Easy morning run",
    "createdAt": "2026-03-04T08:00:00.000Z",
    "activityTypeName": "Running",
    "activityTypeIcon": "🏃"
  }
]
```

### POST /api/activity-logs

Log a new activity. When `goalId` is provided, auto-creates or updates a calendar activity (marks existing uncompleted activity as completed, or creates new one with `isLogEntry=true`). **v2**: After creating the log, auto-completes any matching scheduled activity (same `activityTypeId`, same date, not yet completed).

**Request body**:
```json
{
  "activityTypeId": 1,
  "goalId": 1,
  "date": "2026-03-04",
  "durationMinutes": 45,
  "calories": 380,
  "steps": null,
  "variant": null,
  "metrics": { "distance_km": 5.2, "pace": "5:30", "heart_rate": 155 },
  "notes": "Easy morning run"
}
```

`activityTypeId` is required. `goalId` is optional.

**Response** `201`: The created activity log with joined fields.

### PATCH /api/activity-logs/:id

Update an activity log. Accepts any subset of fields.

### DELETE /api/activity-logs/:id

Delete an activity log.

---

## Body Metrics

### GET /api/body-metrics

Returns body metric entries. Accepts query params:
- `?type=weight` / `vo2max` / `resting_hr` — filter by metric type
- `?from=YYYY-MM-DD` / `?to=YYYY-MM-DD` — date range

### POST /api/body-metrics

Log a new measurement.

**Request body**:
```json
{
  "date": "2026-03-04",
  "metricType": "weight",
  "value": 75.5,
  "unit": "kg"
}
```

**Response** `201`: The created body metric entry.

---

## Activities Summary

### GET /api/activities/summary

Aggregated activities dashboard data. Accepts `?weeks=8` (default 8). Renamed from `/api/fitness/summary` in v2.

**Response** `200`:
```json
{
  "volumeData": [
    {
      "week": "2026-02-24",
      "activities": [{ "minutes": 180, "activityTypeName": "Running", "activityTypeIcon": "🏃", "activityTypeId": 1 }],
      "totalMinutes": 240
    }
  ],
  "streaks": [
    { "activityTypeId": 1, "activityTypeName": "Running", "activityTypeIcon": "🏃", "currentStreak": 4 }
  ],
  "latestBodyMetrics": {
    "weight": { "value": 75.5, "unit": "kg", "date": "2026-03-04", "trend": -0.5 }
  },
  "activityByType": [
    { "name": "Running", "count": 8 },
    { "name": "Tennis", "count": 4 }
  ],
  "recentActivityLogs": [],
  "totalActivityLogs": 42,
  "totalMinutes": 2100,
  "totalCalories": 18500
}
```

`activityByType` provides a breakdown of activity log counts per activity type for the current month, used by the Activities Dashboard bar chart.

---

## Goals

Goals are standalone entities, not owned by weekly plans. They can belong to multiple roles via the `goalRoles` junction table. Goals now support target metrics for progress tracking.

### GET /api/goals

Returns goals with `activityTypeId`, `targetMetric`, `targetValue`, `targetPeriod`, `activityTypeName`, `activityTypeIcon`. Accepts query params:
- `?status=active` (default) / `completed` / `archived` / `all`
- `?roleId=3` — filter to goals belonging to this role
- `?horizon=yearly|monthly|standalone` — **[Goals V2]** filter by horizon. `standalone` returns goals where `horizon IS NULL`
- `?parentId=5` — **[Goals V2]** return only monthly sub-goals for the given yearly goal id
- `?month=2026-03` — **[Goals V2]** return only monthly goals for the given month

**Response** `200`:
```json
[
  {
    "id": 1,
    "title": "Run a half marathon",
    "description": "Train for the spring race",
    "quadrant": "Q2",
    "targetDate": "2026-06-01",
    "sessionsPerWeek": 4,
    "activityTypeId": 1,
    "targetMetric": "durationMinutes",
    "targetValue": 180,
    "targetPeriod": "week",
    "activityTypeName": "Running",
    "activityTypeIcon": "🏃",
    "status": "active",
    "isCompleted": false,
    "horizon": "yearly",
    "parentGoalId": null,
    "month": null,
    "targetUnit": "km",
    "createdAt": "2026-03-04T12:00:00.000Z",
    "updatedAt": "2026-03-04T12:00:00.000Z",
    "roles": [
      { "id": 2, "name": "Athlete", "color": "#EF4444" }
    ]
  }
]
```

Note: `horizon`, `parentGoalId`, `month`, and `targetUnit` are null for existing standalone goals.

Note: `quadrant` is derived from `targetDate` at read time (≤7 days = Q1, else Q2). Not stored in the database.

### POST /api/goals

Create a new goal.

**Request body**:
```json
{
  "title": "Run a half marathon",
  "description": "Train for the spring race",
  "roleIds": [2, 6],
  "targetDate": "2026-06-01",
  "sessionsPerWeek": 4,
  "activityTypeId": 1,
  "targetMetric": "durationMinutes",
  "targetValue": 180,
  "targetPeriod": "week",
  "horizon": "yearly",
  "parentGoalId": null,
  "month": null,
  "targetUnit": "km"
}
```

`activityTypeId`, `targetMetric`, `targetValue`, `targetPeriod` are optional (for metric-based goals).
`horizon`, `parentGoalId`, `month`, `targetUnit` are optional (Goals V2). Omit for backward-compatible standalone goals.

**Response** `201`: The created goal with derived quadrant and roles attached.

### PATCH /api/goals/:id

Update a goal. Accepts: `title`, `description`, `targetDate`, `sessionsPerWeek`, `status`, `isCompleted`, `roleIds`, `activityTypeId`, `targetMetric`, `targetValue`, `targetPeriod`, `horizon`, `parentGoalId`, `month`, `targetUnit`.

### DELETE /api/goals/:id

Delete a goal, its `goalRoles` entries, and (for yearly goals) all linked monthly sub-goals and their role associations.

### GET /api/goals/:id/progress

Returns progress for a goal. Behavior depends on goal type:
- **Metric-based**: sums the relevant metric from activity logs within the current period.
- **Session-based**: counts logs for current week vs `sessionsPerWeek`.
- **Tally-based** (Goals V2): sums `goal_tallies.count` for the current period.
- **Yearly horizon** (Goals V2): aggregates progress from direct logs/tallies AND from all monthly sub-goals. Returns `paceStatus`.

**Response** `200`:
```json
{
  "current": 4,
  "target": 12,
  "percentage": 33,
  "period": "yearly",
  "metricLabel": "books",
  "paceStatus": "ahead",
  "elapsedPercentage": 25
}
```

`paceStatus` and `elapsedPercentage` are only present for goals with `horizon = 'yearly'`. `paceStatus` is one of: `'ahead'` | `'on_track'` | `'behind'` | `'no_data'`.

### GET /api/goals/:id/children `[Goals V2]`

Returns all monthly sub-goals for a yearly goal, each with inline progress data.

**Response** `200`:
```json
[
  {
    "id": 12,
    "title": "Read 1 book",
    "month": "2026-03",
    "targetValue": 1,
    "sessionsPerWeek": 2,
    "progress": { "current": 1, "target": 1, "percentage": 100 }
  }
]
```

---

## Goal Tallies `[Goals V2]`

Simple count-based progress entries for goals that do not require activity type tracking. The tally `count` is always in the same unit as the goal's `targetUnit` -- if the goal is "Run 500 km" (`targetUnit: "km"`), a tally of `count: 5` means 5 km. Tallies and activity-log metrics contribute to the same cumulative total.

### GET /api/goal-tallies

Returns tally entries. Accepts query params:
- `?goalId=5` — filter by goal (required or strongly recommended)
- `?from=YYYY-MM-DD` / `?to=YYYY-MM-DD` — date range

**Response** `200`:
```json
[
  {
    "id": 1,
    "goalId": 5,
    "date": "2026-03-10",
    "count": 1,
    "notes": "Finished Atomic Habits",
    "createdAt": "2026-03-10T20:00:00.000Z"
  }
]
```

### POST /api/goal-tallies

Log a tally entry.

**Request body**:
```json
{
  "goalId": 5,
  "date": "2026-03-10",
  "count": 1,
  "notes": "Finished Atomic Habits"
}
```

`goalId` and `date` are required. `count` defaults to 1. `notes` is optional.

**Response** `201`: The created tally entry.

### DELETE /api/goal-tallies/:id

Delete a tally entry.

**Response** `200`: `{ "success": true }`

---

## Roles

### GET /api/roles

Returns all active roles (add `?archived=true` to include archived).

**Response** `200`:
```json
[
  {
    "id": 1,
    "name": "Professional",
    "description": "Career and work goals",
    "color": "#3B82F6",
    "displayOrder": 0,
    "isArchived": false,
    "isWorkRole": true,
    "maxWeeklyOccurrences": 5,
    "minRestDays": 0,
    "createdAt": "2026-03-04T12:00:00.000Z",
    "updatedAt": "2026-03-04T12:00:00.000Z"
  }
]
```

### POST /api/roles

Create a new role.

**Request body**:
```json
{
  "name": "Athlete",
  "description": "Fitness and sports",
  "color": "#EF4444",
  "isWorkRole": false,
  "maxWeeklyOccurrences": 4,
  "minRestDays": 1
}
```

**Response** `201`: The created role object.

### PATCH /api/roles/:id

Update a role. Accepts any subset of: `name`, `description`, `color`, `displayOrder`, `isArchived`, `isWorkRole`, `maxWeeklyOccurrences`, `minRestDays`.

### PUT /api/roles/reorder

Reorder all roles.

**Request body**:
```json
{ "order": [3, 1, 4, 2, 5] }
```

---

## Weekly Plans

### GET /api/weekly-plans?week=YYYY-MM-DD

Get or auto-create a weekly plan for the given Monday. If no plan exists, one is created.

**Response** `200`: The weekly plan object.

### PATCH /api/weekly-plans

Update planning notes or isPlanned status.

**Request body**:
```json
{
  "weekStartDate": "2026-03-02",
  "planningNotes": "Focus on...",
  "isPlanned": true
}
```

---

## Weekly Focus Goals

Manages which goals are "in focus" for a given week. Goals must already exist in the `goals` table.

### GET /api/weekly-plans/:weekStartDate/goals

Returns all focus goals for the week, with roles and derived quadrant attached.

**Response** `200`:
```json
[
  {
    "id": 1,
    "focusId": 5,
    "title": "Run a half marathon",
    "quadrant": "Q2",
    "targetDate": "2026-06-01",
    "status": "active",
    "isCompleted": false,
    "roles": [{ "id": 2, "name": "Athlete", "color": "#EF4444" }]
  }
]
```

### POST /api/weekly-plans/:weekStartDate/goals

Add an existing goal to this week's focus.

**Request body**:
```json
{ "goalId": 1 }
```

**Response** `201`: The created focus link.
**Response** `409`: Goal is already in focus for this week.

### DELETE /api/weekly-plans/:weekStartDate/goals?goalId=1

Remove a goal from this week's focus.

---

## Activities

Calendar entries. Can be created manually or auto-created when logging via `/api/activity-logs` with a `goalId`.

### GET /api/activities

Get activities. Requires one of:
- `?date=YYYY-MM-DD` — single day
- `?weekStart=YYYY-MM-DD` — full week (7 days from Monday)

Response includes joined `roleName`, `roleColor`, and `isLogEntry` (true when created from an activity log).

### POST /api/activities

Create an activity.

**Request body**:
```json
{
  "title": "Morning run",
  "quadrant": "Q2",
  "activityDate": "2026-03-03",
  "startTime": "07:00",
  "endTime": "08:00",
  "roleId": 2,
  "goalId": 1,
  "notes": "Easy pace",
  "isLogEntry": false
}
```

`isLogEntry` is optional (default false). Set to `true` when the activity was created from logging via `/api/activity-logs`.

### PATCH /api/activities/:id

Update an activity (reschedule, complete, add notes, etc.).

### DELETE /api/activities/:id

Delete an activity.

---

## Recurring Activities

### GET /api/recurring-activities

Get all recurring activities, with joined `roleName` and `roleColor`.

### POST /api/recurring-activities

Create a recurring activity template.

**Request body**:
```json
{
  "roleId": 3,
  "title": "Tennis",
  "quadrant": "Q2",
  "dayOfWeek": 2,
  "startTime": "18:00",
  "endTime": "20:00"
}
```

### PATCH /api/recurring-activities/:id

Update or pause a recurring activity.

### DELETE /api/recurring-activities/:id

Delete a recurring activity.

---

## Schedule Generation

### POST /api/schedule/generate

Generate a proposed schedule based on focus goals, existing activities, recurring events, roles, and scheduler settings.

**Request body**:
```json
{
  "weekStartDate": "2026-03-02",
  "scope": "month",
  "regenerate": true,
  "month": "2026-03"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `weekStartDate` | Yes | Monday of the week (used for weekly plan / focus goals lookup) |
| `scope` | No | `"week"` (default) or `"month"` |
| `regenerate` | No | When `true`, ignores existing scheduler-generated activities for focus goals so the schedule is built from scratch. Default `false`. |
| `month` | No | `"YYYY-MM"` format. Used when `scope = "month"` to ensure the correct calendar month is targeted, regardless of which day-of-week the 1st falls on. |

**Response** `200`:
```json
{
  "activities": [
    {
      "title": "Run a half marathon",
      "quadrant": "Q2",
      "activityDate": "2026-03-03",
      "startTime": "06:00",
      "endTime": "07:00",
      "roleId": 2,
      "goalId": 1,
      "activityTypeId": 1,
      "roleName": "Athlete",
      "roleColor": "#EF4444",
      "reason": "Session 1/4 — personal time"
    }
  ],
  "warnings": ["Could only fit 2/4 sessions for \"Learn Python\""],
  "summary": "Generated 12 activities across 3 goals for the month. Q2 focus: 75%. Spread across 20 days.",
  "regenerate": true,
  "focusGoalIds": [1, 5],
  "dateRange": { "start": "2026-03-01", "end": "2026-03-31" }
}
```

When `regenerate` is `true`, the response includes `focusGoalIds` and `dateRange` metadata. These are passed to the apply endpoint to identify which old activities should be replaced.

**Scheduler algorithm phases**:
1. Classify each day as work/weekend with time windows
2. Calculate sessions needed per goal (`sessionsPerWeek × numWeeks - existing`) -- **[Goals V2]** if a monthly sub-goal exists for the current month, use its `sessionsPerWeek` instead. When `regenerate = true`, existing scheduler-generated activities for focus goals are excluded from the count.
3. Sort goals by urgency (Q1 first, then Q2, then nearest target date)
4. Round-robin placement respecting: work/personal windows, rest-day constraints, max weekly occurrences, no same-day repeats, spread across days
5. Generate summary and warnings

**[Goals V2]** When a focus goal has a monthly sub-goal for the current month, the `reason` field in the generated activity will note: `"Using March benchmark: 5 sessions/week"`.

### POST /api/schedule/apply

Apply a generated schedule by creating all proposed activities. Each activity inherits `activityTypeId` from its linked goal (enabling correct activity type display and matching with activity logs). When `regenerate` is `true`, deletes old scheduler-generated activities (non-logged, non-completed) for the specified focus goals within the date range before inserting new ones.

**Request body**:
```json
{
  "activities": [ /* ProposedActivity[] from generate response */ ],
  "regenerate": true,
  "focusGoalIds": [1, 5],
  "dateRange": { "start": "2026-03-01", "end": "2026-03-31" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `activities` | Yes | Array of proposed activities to create |
| `regenerate` | No | When `true`, deletes old scheduled activities before inserting. Default `false`. |
| `focusGoalIds` | No | Goal IDs whose old activities should be replaced (only used when `regenerate = true`) |
| `dateRange` | No | Date range for deletion (`{ start, end }`, only used when `regenerate = true`) |

**Response** `201`:
```json
{
  "created": 12,
  "deleted": 8,
  "activities": [ /* created Activity objects */ ]
}
```

### POST /api/schedule/reset

Remove all scheduled (non-logged, non-completed) activities within a date range. Used to clear the month before regenerating a fresh schedule. Preserves manually logged activities and completed activities.

**Request body**:
```json
{
  "start": "2026-03-01",
  "end": "2026-03-31"
}
```

**Response** `200`:
```json
{
  "deleted": 24
}
```

---

## Scheduler Settings

### GET /api/scheduler-settings

Returns the app-wide scheduler configuration. Auto-creates defaults on first call.

**Response** `200`:
```json
{
  "id": 1,
  "workStartTime": "09:00",
  "workEndTime": "17:00",
  "workDays": [1, 2, 3, 4, 5],
  "enforceWeeklySpread": true,
  "maxActivitiesPerDay": 4
}
```

### PATCH /api/scheduler-settings

Update scheduler settings.

**Request body** (all fields optional):
```json
{
  "workStartTime": "08:30",
  "workEndTime": "17:30",
  "workDays": [1, 2, 3, 4, 5],
  "enforceWeeklySpread": false,
  "maxActivitiesPerDay": 3
}
```

---

## Scheduler Blackout Dates

### GET /api/scheduler-blackout-dates

Returns all blackout dates, sorted by date.

**Response** `200`: array of `{ id, date, label, isRecurring, createdAt }`.

### POST /api/scheduler-blackout-dates

Create a new blackout date.

**Request body**:
```json
{
  "date": "2026-12-25",
  "label": "Christmas",
  "isRecurring": true
}
```

### DELETE /api/scheduler-blackout-dates/:id

Delete a blackout date.

---

## Goal Session Patterns

### GET /api/goals/:id/session-patterns

Returns session patterns for a goal, sorted by position.

**Response** `200`: array of `{ id, goalId, position, label, restDaysAfter, createdAt }`.

### POST /api/goals/:id/session-patterns

Replace all session patterns for a goal (delete existing, create new).

**Request body**:
```json
{
  "patterns": [
    { "label": "Short run 4km", "restDaysAfter": 1 },
    { "label": "Short run 4km", "restDaysAfter": 1 },
    { "label": "Long run 12km", "restDaysAfter": 2 }
  ]
}
```

### DELETE /api/goal-session-patterns/:id

Delete a single session pattern entry.

---

## Planned Expenses (v2)

### GET /api/planned-expenses?year=YYYY

Returns all planned expenses for a given year.

**Response** `200`:
```json
[
  {
    "id": 1,
    "name": "Christmas gifts",
    "amount": 500,
    "month": "2026-12",
    "categoryId": 3,
    "categoryName": "Amusement",
    "categoryIcon": "🎉",
    "notes": "Family and friends",
    "createdAt": "2026-03-06T12:00:00.000Z",
    "updatedAt": "2026-03-06T12:00:00.000Z"
  }
]
```

### POST /api/planned-expenses

Create a planned expense.

**Request body**:
```json
{
  "name": "Christmas gifts",
  "amount": 500,
  "month": "2026-12",
  "categoryId": 3,
  "notes": "Family and friends"
}
```

**Response** `201`: The created planned expense.

### PATCH /api/planned-expenses/:id

Update a planned expense. Accepts any subset of fields.

### DELETE /api/planned-expenses/:id

Delete a planned expense.

---

## Health Check

### GET /api/health

Simple health check endpoint.

**Response** `200`:
```json
{ "status": "ok" }
```
