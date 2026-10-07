# Feature Specification: Calendar Picker

**Feature Branch**: `007-calendar-picker`
**Created**: 2026-10-07
**Status**: Draft
**Input**: The activity day list is boring and the switch is unwanted. Configure shows every icon and every color at once. A check may play an emoji the person chose, off until they choose one. New activities can be added from this screen.

---

## Background

The week calendar already records a day. The day list does not feel like recording one. Each activity is a repeated row with a switch, which is a settings control. Configure is louder: every icon and every color is on screen for every activity, plus another switch.

This feature makes the day list feel like the colored marks already on the week, and makes Configure a short list. It does not change what a check means. A check is still one completed activity for that day. A watch import or a detailed session still locks that day. A future day still cannot be checked.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Mark the day by clicking the row (Priority: P1)

A person opens This Week and selects a day. The activities are in alphabetical order. There is no switch. They click the row for what they did. That row becomes the same kind of colored bar the week already uses for a finished activity: the icon and the name on that activity's color. The row stays where it was. Clicking it again clears it, and the row becomes quiet again.

**Why this priority**: The switch is the thing they do not want to use. If the row itself cannot record the day, the rest of this work does not matter.

**Independent Test**: On This Week and on Month, open a past or current day, click Running, leave, and come back. Running is still marked, still in the same place, and no switch is on the list. Click it again and the mark is gone.

**Acceptance Scenarios**:

1. **Given** a day that can be edited, **When** the list is shown, **Then** each visible activity is a row with its icon and name, in alphabetical order, and no switch is shown.
2. **Given** Running is not done that day, **When** the person clicks the Running row, **Then** the row becomes a colored bar in Running's color, with its icon and name, and Running has not moved in the list.
3. **Given** Running is marked, **When** the person clicks that row again, **Then** the mark is removed and the row returns to a quiet line in the same place.
4. **Given** the person marks an activity, **When** they leave and return to that day, **Then** the mark is still there.
5. **Given** the day is in the future, **When** they look at the list, **Then** the rows are visible, they cannot be marked, and the list says future days cannot be checked yet.
6. **Given** a row that can be edited is focused, **When** the person presses Enter or Space, **Then** it marks or clears the same way a click does.
7. **Given** a future row or a locked row is focused, **When** the person presses Enter or Space, **Then** the mark does not change and no celebration plays.
8. **Given** the row is marked, **When** the person reads the name, **Then** the icon and the name use the same light treatment as the icon on the week mark, and both can be read on a yellow bar and on a red bar without squinting.

---

### User Story 2 — Choose icon, color, and emoji one at a time (Priority: P2)

A person opens Configure. Each activity is one row: the current icon, the name, one color, one emoji, and the word Hide. Nothing else is open. They click the icon and only that activity's icons appear. They click the color and only that activity's colors appear. They click the emoji and only that activity's emoji choices appear. Choosing one closes the choices and updates the calendar, including days already marked.

**Why this priority**: Configure is unusable while every choice is visible at once. One icon, one color, and one emoji at rest is the screen they asked for.

**Independent Test**: Open Configure and confirm each activity shows one icon, one color, and one empty emoji. Open Running's colors, then Running's icons, and confirm the colors close. Change Running's icon and color, then look at an older running day and see both changes.

**Acceptance Scenarios**:

1. **Given** Configure is open, **When** the person looks at an activity, **Then** they see one icon, the name, one color, one emoji, and the word Hide. They do not see the full set of icons, colors, or emojis.
2. **Given** no emoji has been chosen, **When** Configure opens, **Then** that emoji place is empty.
3. **Given** the person clicks an activity's icon, color, or emoji, **When** the choices open, **Then** they belong to that activity only, and any other open choices close.
4. **Given** the person picks a new icon or color, **When** they look at past days for that activity, **Then** those days use the new icon and color.
5. **Given** the person clicks an emoji, **When** the choices open, **Then** None is first, followed by only this set: smiling face, person meditating, flexed biceps, runner, bicycle, tennis, mountain, open book, writing hand, two people, seedling, and sun.
6. **Given** the person chooses None, **When** Configure is shown again, **Then** that activity's emoji place is empty.
7. **Given** the helper text is shown, **When** Configure opens, **Then** it reads: "Hide what you don't use. Click an icon, a color, or an emoji to change it."

---

### User Story 3 — Celebrate a check with the chosen emoji (Priority: P2)

Marking an activity plays a celebration only when that activity has an emoji. The celebration is that emoji, once, for a short moment under one second. It rises slightly and fades. Clearing the row plays nothing. An activity with no emoji plays nothing. The motions that used to play on every check no longer play.

**Why this priority**: A celebration was asked for, and it has to stay quiet until the person picks an emoji. The old motions play whether or not anyone asked.

**Independent Test**: With Climbing's emoji empty, mark Climbing and see no emoji. Set it to a smiling face, mark it, and see that face once. Clear the mark and see no second celebration. Set it back to None and mark it again with no celebration.

**Acceptance Scenarios**:

1. **Given** an activity has no emoji, **When** the person marks it, **Then** no emoji appears and no other celebration plays.
2. **Given** Climbing's emoji is a smiling face and Meditation's emoji is a person meditating, **When** each is marked, **Then** each plays its own emoji once.
3. **Given** a celebration is still on screen, **When** the person clears that row, **Then** the celebration disappears and no new one starts.
4. **Given** the mark fails to save, **When** the failure is shown, **Then** the celebration is gone and the row is not left marked.
5. **Given** the person has asked the system to reduce motion, **When** a celebration plays, **Then** the emoji fades in place and does not travel.
6. **Given** any check, **When** it is saved, **Then** there is no sound, confetti, streak, or count of celebrations.

---

### User Story 4 — Hide an activity without a switch (Priority: P3)

A person who does not climb this month hides Climbing from Configure with the word Hide. Climbing leaves the day list and sits under Hidden. Show puts it back in alphabetical order, including days where it was already done.

**Why this priority**: The day list should only contain activities they still use. Hiding is the remaining job of the old switch, without the switch.

**Independent Test**: Hide Tennis, confirm it is gone from the day list and listed under Hidden, then show it and confirm it returns in alphabetical order with its old marks.

**Acceptance Scenarios**:

1. **Given** Tennis is shown, **When** the person chooses Hide, **Then** Tennis leaves the main Configure list and the day list, and appears under Hidden.
2. **Given** Tennis is hidden and was already done on an earlier day, **When** the person chooses Show, **Then** Tennis returns to the shown list in alphabetical order and those earlier marks come back.
3. **Given** every activity is hidden, **When** the person opens a day, **Then** they are told to show at least one activity in Configure.
4. **Given** Configure is open, **When** the person looks for a switch, **Then** there is none. Hide and Show are words on the row.
5. **Given** nothing is hidden, **When** Configure opens, **Then** there is no Hidden heading.
6. **Given** several activities are hidden, **When** the person looks under Hidden, **Then** those names are in alphabetical order.

---

### User Story 5 — Add an activity from Configure (Priority: P3)

A person thinks of an activity that is not on the list. At the bottom of Configure they choose Add an activity, type a name, and save. It appears on the day list immediately, with a default icon, a default color, and no emoji. They did not open Settings. They can then change the icon, color, or emoji the same way as any other row.

**Why this priority**: Adding an activity is rare compared with marking a day, but leaving the calendar to do it is the friction they named.

**Independent Test**: Add "French" from Configure, confirm it appears on today's list, then change its icon and color from that row without opening Settings.

**Acceptance Scenarios**:

1. **Given** Configure is open, **When** the person adds an activity with a new name, **Then** it appears on the shown list and on the day list, in alphabetical order, with a default icon, a default color, and no emoji.
2. **Given** the name is empty or only spaces, **When** they try to save, **Then** nothing is created.
3. **Given** an activity named Running already exists, **When** they add "running" from this screen or from Settings, **Then** nothing is created and they are told that name is already used.
4. **Given** the person types " French ", **When** the activity is saved, **Then** the stored name is "French".
5. **Given** the new activity exists, **When** they look in Settings, **Then** it is the same kind of activity Settings already lists. This screen did not create a separate calendar-only list.
6. **Given** Configure is open, **When** the person looks for a way to delete an activity, **Then** there is none. Deleting stays in Settings.
7. **Given** a create includes an emoji, **When** the activity is saved, **Then** it is stored with no emoji.

---

### Edge Cases

- A day that is marked because of a watch import or a detailed session looks marked, cannot be cleared from this list, and still says it was logged in detail or from the watch and cannot be removed here.
- Marking an activity that is already done that day does not create a second mark.
- Clearing a simple check removes that mark. Clearing is refused when the only reason the day is marked is a watch import or a detailed session.
- Hiding an activity keeps its history. Showing it brings the marks back. Hiding does not delete the activity.
- Changing an emoji does not play a celebration. The next successful mark does.
- Opening icon, color, or emoji choices for a second activity closes the first. Opening a different choice on the same row closes the one that was open.
- Done closes Configure and returns to the day list.
- A new activity uses a default icon and a default accent color already used elsewhere in the app. It does not start with an emoji.
- Names are compared without regard to capital letters or spaces at the ends. "Running" and "running" are the same name. The stored name has those spaces removed.
- A failed change to an icon, a color, an emoji, visibility, or a new name leaves the screen as it was before the attempt.
- Clearing a row removes a celebration that has not finished. A clear does not start one.
- Two people using the app never see each other's marks, icons, colors, emojis, or hidden activities.
- The week, the month, and the legend keep their current layout. They follow the icon and color chosen here.
- The old per-activity motions no longer play, including for activities that have no emoji.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The day list MUST let the person mark or clear an activity by clicking the row, or by pressing Enter or Space when that row is focused and can be edited. The list MUST NOT use a switch. Enter or Space on a future row or a locked row MUST NOT change the mark and MUST NOT play a celebration.
- **FR-002**: Visible activities on a day MUST stay in alphabetical order. Marking or clearing an activity MUST NOT move its row.
- **FR-003**: An unmarked row MUST show the activity icon in its color and the activity name on a quiet background. A marked row MUST become a bar in that activity's color, with the icon and the name. The icon and the name on that bar MUST use the same light treatment the week mark already uses for its icon, and both MUST be readable on every palette color, including yellow, lime, and amber.
- **FR-004**: A future day MUST show the rows and MUST NOT accept a mark. It MUST say that future days cannot be checked yet.
- **FR-005**: A day marked by a watch import or a detailed session MUST stay marked. The person MUST NOT be able to clear it here, and the row MUST explain that it was logged in detail or from the watch.
- **FR-006**: Configure MUST show one icon, one color, and one emoji for each shown activity, plus the word Hide. The icon choices, the color choices, and the emoji choices MUST stay hidden until that one control is clicked, and MUST then open for that activity only. Icon choices MUST be the activity icons this screen already offers, and no others.
- **FR-007**: Only one set of choices MUST be open at a time. Opening another closes the one that was open.
- **FR-008**: Choosing an icon or a color MUST update the day list, the week, the month, and the legend, including days already marked. The icon is the activity's own icon. Changing it here changes it everywhere that activity appears, including Settings and the activity log. This feature MUST NOT add a second icon. The emoji is only the celebration. A failed icon, color, or emoji save MUST leave the row looking as it did before the attempt.
- **FR-009**: Every activity MUST start with no emoji. An empty emoji MUST mean a mark plays no celebration. Choosing None MUST return the activity to that empty state.
- **FR-010**: The emoji choices MUST be None, listed first, and exactly these twelve characters: 😊 smiling face, 🧘 person meditating, 💪 flexed biceps, 🏃 runner, 🚴 bicycle, 🎾 tennis, ⛰️ mountain, 📖 open book, ✍️ writing hand, 👥 two people, 🌱 seedling, and ☀️ sun. The person MUST NOT be offered the full emoji keyboard.
- **FR-011**: A successful mark on an activity that has an emoji MUST play that emoji once, for under one second. The emoji rises slightly and fades. Clearing a row MUST NOT start a celebration, and MUST remove one that is still on screen. A failed save MUST remove the celebration and MUST NOT leave the row marked.
- **FR-012**: When the person has asked the system to reduce motion, the emoji MUST fade in place and MUST NOT travel.
- **FR-013**: The motions that currently play on every mark MUST stop. A celebration MUST NOT include sound, confetti, a streak, or a count.
- **FR-014**: Hide MUST remove the activity from the day list and place it under a Hidden heading, with the word Show. The Hidden heading MUST be absent when nothing is hidden. Hidden activities MUST be listed alphabetically. Show MUST return an activity to alphabetical order among shown activities. Hiding MUST keep existing marks. A failed hide or show MUST leave the activity where it was.
- **FR-015**: When every activity is hidden, the day list MUST tell the person to show at least one activity in Configure.
- **FR-016**: Configure MUST let the person add an activity by name without leaving the calendar. The stored name MUST have surrounding spaces removed. The new activity MUST be a normal activity, available anywhere activities are listed, with a default icon, a default color, no emoji, and shown on the calendar immediately. A failed add MUST NOT show the activity as created.
- **FR-017**: Creating an activity MUST reject an empty name. A name that matches an existing activity for that person, ignoring capital letters and surrounding spaces, MUST NOT create a second activity and MUST say that the name is already used. This check belongs to creating an activity, so Settings and this screen both receive it. A celebration sent with the new activity MUST be ignored and stored empty.
- **FR-018**: Configure MUST NOT offer a way to delete an activity.
- **FR-019**: Marks, icons, colors, emojis, and visibility MUST be private to each person.
- **FR-020**: This feature MUST NOT change the meaning of a mark, which day counts as today, the week grid, the month grid, the legend layout, or the dashboard week summary.

### Key Entities

- **Activity**: Something the person can do, such as Running or Climbing. It has a name, one icon, one color, whether it is shown on the calendar, and at most one celebration emoji. The emoji may be empty. This is the same activity used in the rest of the app.
- **Daily mark**: The fact that the person did that activity on one date. The day list shows it as a colored row. This feature changes how the person sets and sees that mark. It does not create a second kind of activity or a second mark for the same activity on the same day.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From an open day, a person can mark one activity in a single click, see the row change color without moving, and find it still marked after leaving and returning.
- **SC-002**: Configure shows one icon, one color, and one emoji per shown activity. At most one chooser is open at a time.
- **SC-003**: An activity with no emoji plays no celebration. An activity with an emoji plays that emoji once on a successful mark, and plays nothing when the mark is cleared.
- **SC-004**: A person can hide an activity and show it again without a switch. While hidden, it is absent from the day list. When shown, its earlier marks are back.
- **SC-005**: A person can add an activity by name from Configure, without opening Settings, and see it on the day list before changing its icon, color, or emoji.
- **SC-006**: A watch or detailed session still cannot be cleared from the day list, and the row still explains why.
- **SC-007**: No person can see another person's marks, icons, colors, emojis, or hidden activities.

---

## Assumptions

- The calendar from Calendar 2.0 is already the week and month the person uses. The new day list and the new Configure appear on both This Week and Month. The week grid, the month grid, and the legend layout stay as they are.
- Suggested emojis in the request are hints for which choice fits an activity. They are not filled in, including for activities that already exist. A later startup MUST NOT write those suggestions in. Climbing is likely to use 😊, meditation 🧘, and running 🏃. The person still has to click the choice.
- 🌱 and ☀️ are in the set so an activity that is not a sport, a book, or a social event still has a calm choice. They are not assigned automatically.
- Icon choices are the activity icons Configure already shows. This feature does not add icons. The icon edited here is the activity's real icon. The emoji is the only field that exists for the celebration.
- A default icon and a default color for a new activity are the same kind of defaults a new activity already receives elsewhere. This spec does not invent a new palette.
- "The same kind of colored bar the week already uses" means a marked row should be recognizable as the same mark, at the size of a list row, with the same light icon treatment the week mark already uses. This spec does not redraw the week or the month.
- Today, past days, and future days follow the calendar's existing rule. This feature does not move that rule.
- Deleting, renaming, and the fuller activity form stay on the Activity Types page in Settings.

---

## Out of Scope

- Redrawing the week grid, the month grid, the legend, or the dashboard week card.
- Changing what a mark stores, how a watch import locks a day, or which calendar day counts as today.
- A celebration when a row is cleared, a celebration for an activity with no emoji, or more than one emoji per activity.
- A switch that turns celebrations on for every activity at once.
- The full emoji keyboard, uploaded icons, or custom color codes.
- Sound, confetti, points, or streaks on this screen.
- A list of activities that exists only on the calendar.
- Deleting an activity from Configure.
- Redesigning the Activity Types page in Settings.
