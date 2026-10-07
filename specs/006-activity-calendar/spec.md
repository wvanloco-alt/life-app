# Feature Specification: Activity Calendar

**Feature Branch**: `006-activity-calendar`
**Created**: 2026-10-04
**Status**: Draft
**Input**: A month calendar where the user checks off the activities they did each day. Checks color the calendar, are configurable, and show on the dashboard without a watch.

---

## Background

Friends are not using the app because logging an activity takes too much setup. Roles only help someone who has read *The 7 Habits*, and the full activity log asks for duration and metrics before the day shows up anywhere.

This feature adds a simpler front door. The user opens a month, checks off what they actually did, and the calendar fills with a color for each activity. A month of climbing reads as that color. A month of running reads as another. No planning, no roles, and no form.

Roles, habits, the scheduler, and the detailed activity log stay as they are. This calendar does not replace them. It is the fast way to record a day, and those records show up wherever the app already shows completed activities.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Check off what you did (Priority: P1)

A user opens the week or the month. Today is easy to see. A short list of their activities is there, in a stable order. Checking one does not move it. They turn on the ones they did. Each turn-on is saved immediately and plays a short celebration that belongs to that activity. They can do the same for any past day. They cannot check a future day.

**Why this priority**: If checking a day is not fast and reliable, nothing else on this calendar matters.

**Independent Test**: Open the calendar, check two activities for today, leave, come back, and confirm both are still checked. Open yesterday, check one activity, and confirm today is unchanged.

**Acceptance Scenarios**:

1. **Given** the user opens the calendar, **When** the page loads, **Then** the month containing today is shown and today is visually distinct.
2. **Given** today has no completions, **When** the user checks Climbing and Running, **Then** both stay checked after they leave and return, and neither row has moved.
3. **Given** the user turns an activity on, **When** the check is saved, **Then** that activity plays its own short celebration. Turning it off does not play one. Running and Climbing do not play the same celebration.
4. **Given** the user checks Climbing for today, **When** they check Climbing again, **Then** there is still only one completion for Climbing on that day.
5. **Given** the user is viewing a past day, **When** they check an activity, **Then** that past day is saved the same way as today.
6. **Given** the user is viewing a future day, **When** they look at the activity list, **Then** they cannot check anything off.
7. **Given** two users both use the calendar, **When** either one opens it, **Then** they see only their own checks.

---

### User Story 2 — Read the month by color (Priority: P2)

A user looks at the month and can see which days they did something without opening each day. Each finished activity is a colored section with that activity's icon, large enough to feel like the day happened. A day with climbing and running shows both sections. A legend names every activity with the same icon and color. Empty days stay blank. They are not marked as missed.

The user can also focus the month on one activity. In that view, only that activity's days carry its color, so a climbing month reads as climbing and a running month reads as running.

**Why this priority**: The color is the reason to check anything off. A list of ticks with no month view does not answer "what did this month look like?"

**Independent Test**: Check climbing on ten days and running on three other days. Confirm the month shows both colors, the legend names them, and a climbing-only view hides the running marks.

**Acceptance Scenarios**:

1. **Given** a day has Climbing and Running checked, **When** the user looks at the week or the month, **Then** that day shows a separate colored section for each, with its icon, not one blended color and not a tiny dot.
2. **Given** a day has nothing checked, **When** the user looks at the month, **Then** that day has no activity color and is not styled as a failure.
3. **Given** several activities are checked across the month, **When** the user looks at the calendar, **Then** a legend shows each visible activity with its icon and color.
4. **Given** the user filters to Climbing, **When** the month redraws, **Then** only Climbing marks remain, and clearing the filter restores the others.
5. **Given** Climbing was done twice on the same day, or for a long time, **When** the user looks at that day, **Then** it shows one Climbing mark. Color does not get stronger with duration or repeats.

---

### User Story 3 — Choose activities and colors (Priority: P3)

A user wants the checklist to match their life. They can hide activities they do not want on the calendar, show ones they hid, pick each activity's color from the app's existing accent colors, and pick its icon from the app's existing activity icons. The calendar already works before they change anything: every activity they already have is shown, each with a default color and icon.

**Why this priority**: The first check must work with no setup. Configuration is how the calendar stays personal after that.

**Independent Test**: Hide Tennis, change Running to a different accent color and a different icon, and confirm the week, the month, and the checklist follow those choices, including days that were already checked.

**Acceptance Scenarios**:

1. **Given** a new user has not changed any settings, **When** they open the calendar, **Then** their existing activities are all available to check, each with a default color.
2. **Given** the user hides Tennis, **When** they return to the calendar, **Then** Tennis is gone from the checklist and from the month marks.
3. **Given** the user shows Tennis again, **When** the calendar reloads, **Then** Tennis returns, including marks on days where it was already completed.
4. **Given** the user changes Running's color or icon, **When** they look at past running days, **Then** those days use the new color and icon.
5. **Given** the user has hidden every activity, **When** they open the calendar, **Then** they see a clear prompt to show at least one activity, not a broken month.

---

### User Story 4 — See completed activities without a watch (Priority: P4)

A user without Garmin opens the dashboard. Sleep and calories still explain that a watch is needed, because those numbers have no other source. The week activity summary does not. It shows how many activities were completed this week, including simple calendar checks, and it still shows zero with a way into the calendar when nothing was completed.

**Why this priority**: The calendar fails its purpose if the home page still looks empty until a watch is connected.

**Independent Test**: With Garmin disconnected, check two activities this week, open the dashboard, and confirm the week summary shows them. Confirm sleep and calories still point to Garmin.

**Acceptance Scenarios**:

1. **Given** Garmin is not connected and the user checked two activities this week, **When** they open the dashboard, **Then** the week summary includes those two completions.
2. **Given** Garmin is not connected and nothing was completed this week, **When** they open the dashboard, **Then** the week summary shows zero and a way to open the calendar, not only a prompt to connect Garmin.
3. **Given** Garmin is not connected and there is no sleep or calorie data, **When** they open the dashboard, **Then** sleep and calories still say a watch connection is needed.
4. **Given** the same activity was both checked on the calendar and imported from Garmin on the same day, **When** the week summary is shown, **Then** that activity counts once for that day.

---

### Edge Cases

- What if the user unchecks an activity that was only a simple check? The completion and its color mark are removed.
- What if that day already has a detailed session, or a session imported from Garmin, for the same activity? The day stays marked. Unchecking does not delete that richer record. The control stays checked and does not pretend the session can be erased from the calendar.
- What if the user checks an activity that is already completed that day by a detailed session or a watch import? The day shows as done. No second completion is created.
- What if the user changes which activities are visible? Hidden activities disappear from the checklist and the month. Their completions are kept and reappear when the activity is shown again.
- What if an activity is renamed or removed elsewhere in the app? Days that used it no longer offer it on the checklist. Existing completions for a removed activity are not shown as broken marks.
- What if many activities are checked on one day? The week shows a colored icon section for each. The month shows three sections and a count of the rest. Every checked activity remains identifiable from the legend and from that day's list. The cell does not collapse them into one color. The list order does not change.
- What if the user opens a month with no completions? The grid still renders, days are blank, and today's list is ready to check.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST offer a week calendar and a month calendar as the place to record activities done on each day. These replace the scheduled-activity week and month in the sidebar.
- **FR-002**: Opening the calendar MUST show the month that contains today, with today visually distinct.
- **FR-003**: The user MUST be able to check and uncheck activities for today and for any past day. One action saves the change. No duration, role, or note is required.
- **FR-004**: The user MUST NOT be able to check activities on a future day.
- **FR-005**: Each activity MUST show at most one mark per day. Repeating a check, doing it twice, or logging a long session MUST NOT create a second mark or a stronger color. A manual log and a watch import MAY still store more than one session for that activity on that day. The week and the month draw one mark either way.
- **FR-006**: A checked activity MUST appear as its own colored section on that day, with the activity's icon inside it. The section MUST be large enough to read at a glance on the week view. A day with several activities MUST show one section per activity. The day's list MUST keep a stable order. Checking an activity MUST NOT move its row. The month cell shows up to three sections and a count of any further ones. Those further activities remain in the day's list and the legend. The cell MUST NOT collapse activities into one blended color or into a tiny dot.
- **FR-007**: Days with no completions MUST stay visually quiet. The calendar MUST NOT style them as missed or failed days.
- **FR-008**: A legend MUST name each visible activity and show its icon and color.
- **FR-008a**: Turning a check on MUST play a short celebration that is always the same for that activity and different from the other activities. Turning a check off MUST NOT play one. When the person has asked the system to reduce motion, the celebration motion MUST NOT play.
- **FR-009**: The user MUST be able to filter the month to a single activity, and MUST be able to clear that filter.
- **FR-010**: Every activity the user already has MUST appear on the calendar by default, each with a default color, before any configuration.
- **FR-011**: The user MUST be able to show or hide each activity on the calendar, set its color from the app's existing accent colors, and set its icon from the app's existing activity icons.
- **FR-012**: A color, icon, or visibility change MUST apply to past days as well as later ones. Hiding an activity MUST NOT delete its completions.
- **FR-013**: Unchecking a simple calendar completion MUST remove that completion and its mark.
- **FR-014**: A detailed session or a Garmin import for the same activity and day MUST keep the day marked. The calendar MUST NOT delete that record when the user interacts with the checkbox.
- **FR-015**: Calendar completions MUST count in the dashboard week summary. The same activity on the same day MUST count once there, even if it was also imported or logged in detail. Digest totals, goal session counts, and the activities heatmap keep counting each stored session.
- **FR-016**: When Garmin is not connected, the dashboard week summary MUST show the completed-activity count for the week, including zero, and MUST offer a way to the calendar. It MUST NOT show only a prompt to connect Garmin.
- **FR-017**: When Garmin is not connected and sleep or calorie numbers are absent, those dashboard areas MUST still explain that a watch connection is needed.
- **FR-018**: Checks, colors, and visibility choices MUST be private to each user.
- **FR-019**: Habits, roles, the scheduler, and the detailed activity log MUST keep their current behavior. This feature MUST NOT require the user to use them.

### Key Entities

- **Activity**: Something the user can do, such as Running or Climbing. It has a name, an icon, a color, and whether it appears on the calendar. One list of activities already exists per user; this feature changes how those activities are shown and checked, not what an activity is.
- **Daily completion**: The fact that a user did one activity on one calendar date. At most one per activity per day. It can come from a simple check, a detailed session, or a watch import. The calendar shows it; it does not create a second kind of activity.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From an open calendar, a user can record one activity for today in a single action and see it still recorded after leaving and returning.
- **SC-002**: A month with climbing on most days and running on a few others can be told apart by the colored icon sections and the legend, without opening each day.
- **SC-002a**: Checking an activity does not change its place in the list. Turning Running on plays a different celebration from turning Climbing on.
- **SC-003**: Filtering to one activity hides every other activity's marks, and clearing the filter brings them back.
- **SC-004**: A first-time user can check an activity without changing any settings first.
- **SC-005**: With Garmin disconnected, the dashboard week summary matches the number of distinct activities completed this week, including a count of zero.
- **SC-006**: Unchecking a simple check removes its mark. A Garmin or detailed session on that same activity and day is still present afterward.
- **SC-007**: No user can see another user's checks, colors, or visibility choices.

---

## Assumptions

- "A lot of red means a lot of climbing" means many days carry that activity's color, not that a single day gets darker when the session was longer.
- The checklist uses activities the user already has. It does not invent a separate list, and it does not ask them to pick roles or goals.
- Default colors come from the app's existing accent colors. Users do not enter custom color codes.
- Past days are editable. Future days are visible in the month and cannot be checked, because this is a record of what happened.
- Habits stay a separate daily practice. This calendar is for activities such as climbing, running, and tennis.
- Reordering the checklist, notes, targets, streaks, and custom layouts are out of scope.
- Sleep and calories are not estimated from checked activities.
- "Today" is the calendar day in Belgium. The highlighted day and the day a check is allowed to save are that same day.
- Counting an activity once per day applies to the dashboard week card. A check can still lengthen a streak on the Activities page. This calendar does not show that streak, and it does not hide the check from it.
- When a run in the same week has a distance, the dashboard week card's large number is that distance. The activity count is the smaller line. When there is no distance, the count is the large number.

---

## Out of Scope

- Deleting roles, habits, the scheduler, or the detailed activity log. The scheduled week and month leave the sidebar. Their code stays for a later redesign.
- Planning future sessions from this calendar.
- Scoring, streaks, targets, or prompts that encourage doing more.
- Entering duration, distance, or other metrics on the check itself.
- Showing sleep or calorie trends without a watch.
