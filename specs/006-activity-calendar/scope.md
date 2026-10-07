# Scope: Calendar 2.0

**Feature ID:** `calendar2.0`
**Branch:** `006-activity-calendar`
**Status:** Scope drafted 2026-10-04
**Builds on:** Activity types, activity logs, and the dashboard week card
**Last updated:** 2026-10-04, after review

---

## Why

Friends are not using the app. Logging an activity asks for duration and metrics. Roles only pay off if someone has read *The 7 Habits*. The home page stays empty unless Garmin is connected.

Ann-Sophie described the version she would actually open: a week and a month, a short list of her activities on each day, and a check for what she did. Those checks color the days. A lot of climbing reads as red. A lot of running reads as blue. She can choose which activities appear and which color each one uses.

This replaces the scheduled week and the scheduled month in the sidebar. Those screens are unused. This one records a real day in a few taps. It does not ask anyone to plan a week, pick a role, or own a watch. The old scheduler stays in the code for a later redesign. It is not deleted here, and it is not what the sidebar opens.

---

## Who it is for

Someone who will check a day and will not set up goals, roles, or a schedule. The same screen still works for someone who already logs detailed sessions or syncs a watch. Their existing sessions show up as done. The calendar does not erase them.

---

## What's in scope

### 1. Check off the day

The user opens This Week or Month from the sidebar. Today is the calendar day in Belgium, and it is obvious. Each day has the same short list of activities, in a fixed order. Turning one on does not move it. Turning one on also plays a short celebration that belongs to that activity and is different for each activity. Turning one off does not. Today and any past day can be edited. A future day can be seen and cannot be checked, because this is a record of what already happened.

Checking the same activity twice on one day still leaves one check. Doing it for a long time does not make the day "more" of that color.

### 2. Read the month by color

Each finished activity is a colored section with its icon, large enough that the day looks done. A day with climbing and running shows both sections. The week shows every section. The month shows three, then a count of the rest. The cell does not blend into one color, and it does not use a tiny dot. A legend shows the same icon and color. Days with nothing checked stay blank. They are not marked as missed.

The user can focus the month on one activity. In that view, only that activity's days carry its color, which is how a climbing month reads as red and a running month reads as blue.

### 3. Choose what appears, which color, and which icon

The first visit needs no setup. Every activity the person already has is on the list, with a default color and icon. Climbing starts red. Running starts blue.

They can hide an activity, show it again, pick a color from the app's existing accents, and pick an icon from the app's existing activity icons. A change applies to past days as well. Hiding an activity keeps its history. Showing it again brings the sections back.

### 4. Show those days on the dashboard without a watch

The week summary on the dashboard counts completed activities, including these checks. The same activity on the same day counts once on that card, even if a watch also imported it. When a run in that week has a distance, the large number is the kilometres and the count is the smaller line.

With Garmin disconnected and nothing completed, the week card shows zero and a way into This Week. Sleep and calories still say a watch is needed. Those numbers have no other source.

The digest, goal session counts, and the activities heatmap still count each stored session. A check can lengthen a streak on the Activities page. This calendar does not show that streak.

### 5. Keep a check separate from a fuller session

A simple check is a completed activity for that day. If the only record is that check, unchecking removes it.

If that day already has a detailed log or a Garmin import for the same activity, the day stays checked. The calendar does not delete that richer record.

---

## What is explicitly out of scope

- Deleting roles, habits, the scheduler, or the detailed activity log. The scheduled week and month leave the sidebar. Their code stays for a later redesign.
- Planning future sessions from this screen.
- Duration, distance, notes, or metrics on the check itself.
- Streaks, targets, scores, or prompts that push the user to do more.
- Making a single day darker because the session was longer.
- Custom color codes, custom fonts, or a choice of calendar layouts.
- Estimating sleep or calories from checked activities.
- A separate list of activities that exists only on this calendar. It uses the activities the person already has.

---

## What a reviewer should be able to see

1. Open This Week or Month and check two activities for today without changing any settings. Leave and come back. Both are still checked.
2. Look at the week or the month and tell climbing days from running days by the colored icon sections and the legend, without opening each day. Checking an activity does not move it in the list, and Running's celebration is not Climbing's.
3. Filter to one activity and see only that color. Clear it and see both again.
4. Hide an activity and change another's color. Past days follow.
5. With Garmin disconnected, the dashboard week card shows the checks, including a count of zero with a link to the calendar. Sleep and calories still ask for a watch.
6. A detailed session or a Garmin import on that day stays after the user tries to uncheck it.

---

## Schema changes summary

| Table | Change |
|---|---|
| `activity_types` | `calendar_visible` — whether it appears on this calendar. Default on. |
| `activity_types` | `calendar_color` — a palette name such as `red` or `blue`. |
| `activity_logs` | `source` — `calendar`, `manual`, or `garmin`. A check is `calendar`. Uncheck deletes only those rows. |

No new table. A check is an activity log the rest of the app already understands.

---

## Dependencies

- Activity types and activity logs, already shipped
- The dashboard week card, already shipped
- Garmin sync stays optional. The calendar works without it.
