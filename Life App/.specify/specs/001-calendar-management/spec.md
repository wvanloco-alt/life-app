# Feature Specification: Calendar Management (7 Habits)

**Feature Branch**: `001-calendar-management`
**Created**: 2026-02-27
**Status**: Clarified
**Input**: User description: "Based on the principles from 7 Habits of Highly Effective People, I want to manage my calendar based on goals and principles I set for myself. These can be athletic, career, personal, anything that makes sense to add. The calendar can be in-app, doesn't need to integrate."

## Overview

A personal planning system based on Stephen Covey's "fourth generation" time management from *The 7 Habits of Highly Effective People*. The core idea: instead of managing tasks by urgency, the user organizes life around **roles** and **goals**, plans at the **weekly** level, and uses Covey's urgency/importance matrix to stay focused on what truly matters (Quadrant II).

This is not a traditional calendar. It is a **life planning tool** that happens to display events on a timeline.

### Key Concepts from the Book

- **Roles**: The user's key life areas (e.g., Individual, Partner, Professional, Athlete, Friend, Community Member). These are stable but editable.
- **Weekly Goals**: Each week, the user sets 1-3 goals per role. These are the "big rocks" that get scheduled first.
- **Four Quadrants**: Activities are categorized by urgency and importance:
  - **Q1** (Urgent + Important): Crises, deadlines, emergencies
  - **Q2** (Not Urgent + Important): Prevention, planning, relationship-building, exercise, learning -- *the heart of effectiveness*
  - **Q3** (Urgent + Not Important): Interruptions, some meetings, some calls
  - **Q4** (Not Urgent + Not Important): Time-wasters, excessive social media, busywork
- **Mission Statement**: A personal compass that guides all planning decisions.
- **Sharpen the Saw**: Renewal activities across four dimensions -- Physical, Mental, Social/Emotional, Spiritual.
- **Weekly Planning, Daily Adapting**: Plan the week on Sunday (or a chosen day). Each morning, review and adapt the day's plan.

---

## Clarifications

### Session 2026-02-27

- Q: What is the minimum time block granularity for scheduling activities? → A: 30 minutes
- Q: How does goal completion work -- binary, percentage, or checklist? → A: Binary (Done / Not Done)
- Q: Does the calendar week start on Sunday or Monday? → A: Monday (planning happens Sunday evening for the week ahead starting Monday)
- Q: How should the app protect against local data loss? → A: Auto-backup daily to a local folder
- Q: Should the calendar support recurring activities? → A: Yes, simple weekly recurrence only (e.g., "Tennis every Tuesday 18:00-20:00")

---

## User Scenarios & Testing

### User Story 1 - Define Life Roles (Priority: P1)

The user opens the app for the first time and defines their life roles. These are the categories through which they organize all of their goals and activities. Roles can be added, renamed, reordered, or archived at any time. Each role has a name and an optional short description.

**Why this priority**: Roles are the foundational data structure. Nothing else works without them. They are the answer to "who am I trying to be?" -- the starting point of the 7 Habits approach.

**Independent Test**: Can be fully tested by creating, editing, and deleting roles. Delivers value by making the user articulate their life dimensions.

**Acceptance Scenarios**:

1. **Given** the app is opened for the first time, **When** the user navigates to setup, **Then** they see a prompt to define their life roles with example suggestions (Individual, Professional, Partner, Parent, Athlete, Friend, Community Member).
2. **Given** the user has defined 5 roles, **When** they add a 6th role called "Mentor", **Then** it appears in their role list and is available for goal-setting.
3. **Given** the user has a role called "Athlete", **When** they rename it to "Health & Fitness", **Then** all existing goals and activities linked to that role reflect the new name.
4. **Given** the user wants to remove a role, **When** they archive "Community Member", **Then** it no longer appears in the weekly planning view, but historical data is preserved.
5. **Given** the user has roles defined, **When** they reorder them by dragging, **Then** the new order is reflected everywhere roles are displayed.

---

### User Story 2 - Write a Personal Mission Statement (Priority: P1)

The user writes their personal mission statement -- a declaration of who they want to be and what they want to achieve. This statement is always accessible from the main navigation and serves as a compass for all planning decisions. It can be edited at any time.

**Why this priority**: The mission statement is the "compass" from Habit 2 (Begin with the End in Mind). It gives meaning to all the planning that follows. Without it, the planning system is just a task manager.

**Independent Test**: Can be tested by writing, saving, editing, and viewing the mission statement from different screens.

**Acceptance Scenarios**:

1. **Given** the user has no mission statement, **When** they navigate to the mission statement section, **Then** they see a writing prompt with Covey's guidance: "What do you want to be (character) and do (contributions and achievements) and the values/principles upon which being and doing are based?"
2. **Given** the user writes a mission statement, **When** they save it, **Then** it persists and is visible from the main planning screen.
3. **Given** the user wants to revise their mission statement, **When** they edit it, **Then** the previous version is saved in a history log with the date of change.
4. **Given** the user is on any planning screen (weekly or daily), **When** they click a "compass" icon, **Then** their mission statement is displayed without leaving the current view.

---

### User Story 3 - Weekly Planning Session (Priority: P1)

On a chosen day (default: Sunday), the user conducts their weekly planning session. They review their roles, set 1-3 goals per role for the coming week, and schedule those goals into specific time blocks on the weekly calendar. The app guides the user through this process step by step.

**Why this priority**: This is the core interaction loop. Weekly planning is the engine of the 7 Habits approach -- it's where intention becomes action.

**Independent Test**: Can be tested by completing a full weekly planning session: reviewing roles, setting goals, scheduling them, and seeing the resulting week view.

**Acceptance Scenarios**:

1. **Given** it is the user's planning day, **When** they open the app, **Then** they see a prompt to start their weekly planning session (dismissible if they want to skip).
2. **Given** the user starts a weekly planning session, **Then** the app presents their roles one by one and asks them to set 1-3 goals for each role this week.
3. **Given** the user has set goals for all roles, **When** they proceed, **Then** they see a weekly calendar view with their existing commitments and empty time blocks where goals can be dragged or scheduled.
4. **Given** the user drags a goal into a time block (e.g., Wednesday 7:00-8:00 AM), **Then** the goal appears as a scheduled event with the role name and goal title visible.
5. **Given** the user completes the planning session, **When** they save, **Then** the week view shows all scheduled goals color-coded by role.
6. **Given** the user has goals they did not schedule, **Then** they appear in an "unscheduled goals" sidebar for the week, as a reminder of what still needs time.

---

### User Story 4 - Classify Activities by Quadrant (Priority: P2)

When adding or reviewing any activity (scheduled or unscheduled), the user can assign it to one of the four urgency/importance quadrants. The app provides a visual matrix view showing how the user's time is distributed across quadrants. Over time, this helps the user see patterns and shift toward more Q2 activity.

**Why this priority**: The quadrant classification is what distinguishes this from a regular calendar. It's important but not blocking -- the calendar works without it, but gains depth with it.

**Independent Test**: Can be tested by creating activities, assigning quadrants, and viewing the matrix distribution.

**Acceptance Scenarios**:

1. **Given** the user adds a new activity, **When** they are in the activity detail view, **Then** they see a quadrant selector (a 2x2 grid they can tap) defaulting to Q2 (encouraging proactive behavior).
2. **Given** the user has 10 activities scheduled this week across different quadrants, **When** they view the quadrant matrix, **Then** they see a visual breakdown showing percentage of time in each quadrant.
3. **Given** the user has more than 40% of their time in Q3 or Q4, **When** they view their weekly summary, **Then** the app highlights this with a gentle visual indicator (not an alarm -- per the constitution, AI advises, not demands).
4. **Given** the user views a past week, **When** they look at the quadrant matrix, **Then** they see how that specific week's time was distributed, enabling week-over-week comparison.

---

### User Story 5 - Daily Adaptation View (Priority: P2)

Each morning (or whenever the user checks in), they see a daily view derived from their weekly plan. They can adjust the day's schedule: move activities, add new ones, mark activities as complete, or carry forward incomplete goals. The daily view respects the weekly plan but adapts to reality.

**Why this priority**: Covey emphasizes that the plan is a guide, not a prison. Daily adapting is what makes weekly planning sustainable rather than rigid.

**Independent Test**: Can be tested by creating a weekly plan, then modifying the daily view for a specific day.

**Acceptance Scenarios**:

1. **Given** the user opens the app on a weekday morning, **When** they navigate to "Today", **Then** they see today's scheduled activities pulled from the weekly plan, ordered by time.
2. **Given** an activity from yesterday was not completed, **When** the user views today, **Then** the incomplete activity appears in a "Carried Forward" section at the top, and they can reschedule or dismiss it.
3. **Given** the user needs to add an unplanned activity (e.g., a colleague calls), **When** they quick-add it, **Then** it appears in today's schedule with a quadrant assignment prompt.
4. **Given** the user completes an activity, **When** they mark it done, **Then** it shows a visual completion indicator and the weekly progress view updates.
5. **Given** the user finishes their day, **When** they view the daily summary, **Then** they see how many activities were completed vs. planned, and the quadrant distribution for that day.

---

### User Story 6 - Sharpen the Saw Tracking (Priority: P3)

The user tracks renewal activities across Covey's four dimensions: Physical (exercise, nutrition, rest), Mental (reading, learning, writing), Social/Emotional (relationships, service, empathy), and Spiritual (meditation, reflection, values alignment). These are displayed in a simple weekly scorecard.

**Why this priority**: Important for long-term effectiveness, but the app works without it. It enriches the planning system and later feeds into the overview dashboard (Feature 4).

**Independent Test**: Can be tested by logging renewal activities in each dimension and viewing the weekly scorecard.

**Acceptance Scenarios**:

1. **Given** the user views the Sharpen the Saw section, **Then** they see four quadrants labeled Physical, Mental, Social/Emotional, and Spiritual, each with a progress indicator for the current week.
2. **Given** the user logs a 30-minute run under Physical, **Then** the Physical dimension progress increases.
3. **Given** the user has logged activities in 3 of 4 dimensions this week, **When** they view the scorecard, **Then** the neglected dimension (e.g., Spiritual) is visually highlighted as needing attention.
4. **Given** the user views a trend over 4 weeks, **Then** they see which dimensions are consistently attended to and which are neglected.

---

### User Story 7 - Weekly and Trend Analytics (Priority: P3)

At the end of each week (or on demand), the user can view a summary of the past week and trends over time. This includes: time distribution by role, time distribution by quadrant, goal completion rate per role, and Sharpen the Saw balance. Trend data covers the last 4, 8, and 12 weeks.

**Why this priority**: Analytics are a "read" feature -- they don't create data, they reflect on it. Valuable for self-awareness but not essential for the planning loop.

**Independent Test**: Can be tested by entering data for several weeks and viewing the resulting analytics.

**Acceptance Scenarios**:

1. **Given** the user has completed one full week of planning, **When** they view the weekly summary, **Then** they see: total hours planned vs. completed, breakdown by role (pie chart), breakdown by quadrant (2x2 visual), and goal completion rate.
2. **Given** the user has data for 4+ weeks, **When** they view trends, **Then** they see line charts showing Q2 time percentage over time, goal completion rate over time, and Sharpen the Saw balance over time.
3. **Given** the user's Q2 time has increased over the last 4 weeks, **When** they view the trend, **Then** the chart shows a positive trajectory with a visual celebration (e.g., a green upward arrow).
4. **Given** a specific role has had 0 goals for 3 consecutive weeks, **When** the user views analytics, **Then** it is flagged as "neglected" with a subtle visual indicator.

---

### Edge Cases

- What happens when the user creates no roles? The app cannot proceed to weekly planning and should prompt role creation first.
- What happens when the user sets no goals for a role during weekly planning? That's allowed -- not every role needs attention every week. But if a role is consistently ignored (3+ weeks), analytics should flag it.
- What happens if the user skips weekly planning entirely? The daily view shows an empty schedule with a gentle prompt to plan the week. Past weeks without plans show as "unplanned" in analytics.
- What happens if the user reschedules an activity to a different week? The goal moves to the new week, and the original week's analytics update accordingly.
- What happens when the user edits their roles mid-week? New roles are available immediately. Archived roles remain in existing plans but are not offered for new goals.
- How many roles can a user have? No hard limit, but the UI should work well with 3-10 roles. More than 10 may indicate over-fragmentation (a UX note, not a technical restriction).

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow the user to create, edit, reorder, and archive life roles.
- **FR-002**: System MUST allow the user to write, edit, and view a personal mission statement with version history.
- **FR-003**: System MUST support weekly planning sessions where the user sets 1-3 goals per role and schedules them on a weekly calendar.
- **FR-004**: System MUST display a weekly calendar view with time blocks, showing scheduled goals color-coded by role.
- **FR-005**: System MUST allow activities to be classified into one of four quadrants (Q1-Q4) with a default of Q2.
- **FR-006**: System MUST provide a daily view derived from the weekly plan, supporting addition, completion, rescheduling, and carry-forward of activities.
- **FR-007**: System MUST track Sharpen the Saw activities across four dimensions (Physical, Mental, Social/Emotional, Spiritual) with a weekly scorecard.
- **FR-008**: System MUST provide weekly summary analytics: time by role, time by quadrant, goal completion rate, and Sharpen the Saw balance.
- **FR-009**: System MUST provide trend analytics over 4, 8, and 12 weeks for quadrant distribution, goal completion, and role balance.
- **FR-010**: System MUST persist all data locally with no external service dependency.
- **FR-011**: System MUST allow the user to choose their weekly planning day (default: Sunday).
- **FR-012**: System MUST display unscheduled goals in a sidebar during weekly and daily views.
- **FR-013**: System MUST preserve historical data when roles are archived or renamed.
- **FR-014**: System MUST show incomplete activities from previous days as "Carried Forward" in the daily view.
- **FR-015**: System MUST use 30-minute time blocks as the minimum scheduling granularity.
- **FR-016**: System MUST treat goal completion as binary (Done or Not Done).
- **FR-017**: System MUST display the calendar week starting on Monday.
- **FR-018**: System MUST automatically back up all data daily to a local backup folder, retaining at least the last 7 backups.
- **FR-019**: System MUST support simple weekly recurring activities (repeat every week on the same day and time). The user can create, edit, and cancel recurring activities.

### Key Entities

- **Role**: A life area defined by the user. Has a name, optional description, display order, color, and active/archived status.
- **Mission Statement**: A text document with version history. Only one active version at a time.
- **Weekly Plan**: A container for a specific week (identified by Monday start date). Contains goals linked to roles and scheduled time blocks.
- **Goal**: A specific outcome the user wants to achieve this week, linked to a role. Has a title, optional description, binary completion status (Done / Not Done), and quadrant classification (Q1-Q4, default Q2).
- **Activity**: A scheduled time block on the calendar (minimum 30-minute granularity). Linked to a goal (or standalone). Has start time, end time, quadrant, completion status, optional notes, and optional weekly recurrence flag.
- **Recurring Activity**: A template for activities that repeat every week on the same day/time. Can be paused or cancelled. Each occurrence is an independent Activity that inherits defaults from the template.
- **Sharpen the Saw Entry**: A logged renewal activity with dimension (Physical/Mental/Social-Emotional/Spiritual), duration, date, and optional description.
- **Backup**: An automatic daily snapshot of all data, stored in a local backup folder. At least 7 most recent backups are retained.

## Success Criteria

### Measurable Outcomes

- **SC-001**: The user can complete a full weekly planning session (define goals for all active roles and schedule at least 3 of them) in under 15 minutes.
- **SC-002**: The daily view loads and displays the current day's schedule in under 2 seconds.
- **SC-003**: After 4 weeks of use, the user can view trend analytics showing their quadrant distribution and goal completion trajectory.
- **SC-004**: The user can access their mission statement from any screen within 1 click/tap.
- **SC-005**: All data persists correctly across app restarts with no data loss.
- **SC-006**: The app remains fully functional without any internet connection.

## Review & Acceptance Checklist

- [x] All P1 user stories have acceptance scenarios that are independently testable
- [x] All P2 user stories have acceptance scenarios that are independently testable
- [x] All P3 user stories have acceptance scenarios that are independently testable
- [x] Functional requirements are technology-agnostic (no implementation details)
- [x] Key entities are defined with relationships clear
- [x] Edge cases are documented
- [x] Success criteria are measurable
- [x] Spec aligns with Constitution principles (effectiveness over busyness, local-first, visual feedback, modular design)
- [x] No out-of-scope features included (no budget, fitness, AI agent, authentication, external integrations)
