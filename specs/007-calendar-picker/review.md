# Spec Review: Calendar Picker

**Reviewer**: Agent
**Date**: 2026-10-07
**Documents reviewed**: `spec.md`, `checklists/requirements.md`
**Checked against**: the live calendar on `/this-week` and `/monthly-plan` (`CalendarDayPanel`, `CalendarConfigure`, `ActivityMark`, the check animation in `globals.css`, activity-type create/update)
**Status**: One change before planning. The rest of the spec matches the screen that is already built.

---

## Verdict

This is a change to a screen that exists, and the diagnosis is right. The day list is a row plus a switch. Configure repeats the full icon set and the full palette under every activity, plus another switch. Every successful check plays a named motion whether or not anyone chose it. Those three facts are in the code, not just in the background.

The fix is also the right size. The row becomes the mark. Configure shows one icon, one color, and one emoji until a person opens one of them. A celebration happens only after they pick an emoji. Adding an activity does not invent a second list, and delete stays in Settings.

| # | What has to change | Why it blocks |
|---|---|---|
| 1 | Rewrite the marked-row text color in FR-003 and US1 scenario 7 | "A light tint of the same color" is unreadable on yellow, lime, and amber, and it is not what the week mark already does |

The items under "Add these sentences" are not product disagreements. They are gaps an implementer will fill with a guess.

---

## What is strong

**The switch is the wrong control.** A switch is how this app turns a setting on. A day is a record. Making the row itself the colored bar means the control and the result are the same object. That explanation is hard to vary: keep the switch and the complaint is still there.

**Configure matches the complaint.** `calendar-configure.tsx` renders every `ACTIVITY_TYPE_ICONS` entry and every palette swatch for every activity, with a visibility switch. One open chooser at a time is the direct fix. "Choosing one closes the choices" is testable.

**The celebration is opt-in, and the old ones stop.** The day panel maps Running to "sweep", Climbing to "climb", and so on, and plays that on every check. Those motions are unsolicited feedback. An emoji the person picked, once, under a second, with no sound, confetti, streak, or count, is a bounded replacement. Leaving the emoji empty means no celebration. Suggested emojis stay suggestions. That keeps the choice with the person.

**The data model does not need a new kind of activity.** Icon and color already live on the activity. A new emoji is one more empty field on that same activity. Hide and Show are the visibility flag that already exists, without the switch. Add uses the same create path Settings uses. FR-020 protects the week grid, the month grid, the legend, the meaning of a mark, today, and the dashboard count. That is the right boundary.

**Locked days stay locked.** A watch import or a detailed session stays marked, cannot be cleared here, and still explains why. Marking something already done does not create a second mark. That rule is already implemented and this spec does not reopen it.

**Priority order is right.** The row is P1. Configure and the celebration are P2. Hide and add are P3. A person can mark a day without ever opening an emoji.

---

## Blocker

### The marked row's text color will fail on real palette colors

US1 scenario 7 and FR-003 say that text sitting on an activity's color is "a light tint of the same color."

The week mark does not work that way. `ActivityMark` draws a white icon on the solid palette color. The assumption says a marked row should be recognizable as that same mark, at the size of a list row, and that this feature does not redraw the week.

A light tint of the color, on a bar of that color, fails for the colors this app actually assigns. Running is blue, which can survive. Tennis is lime. Reading is amber. The default cycle also includes yellow. Pale yellow on yellow does not meet "the name is readable." A tester cannot pass or fail "light tint" without inventing a recipe, and the obvious recipe is the one that fails.

**Required change:** the icon and the name on a marked row are light enough to read on that activity's bar, for every palette color, including yellow, lime, and amber. Use the same light treatment the week mark already uses for its icon. Do not specify a pale tint of the hue. The test is: the name can be read on a yellow bar and on a red bar without squinting.

---

## Add these sentences

### The day list and Configure are on both pages

`/this-week` and `/monthly-plan` both render `CalendarView`. The week grid and the month grid differ. The day panel and Configure do not. US1's test says "open This Week." Someone following that test can leave the month page on the old switch.

Add to the assumptions: the new day list and the new Configure appear on both This Week and Month. The grids and the legend layout stay as they are.

### The icon chooser is the set Configure already has

FR-006 says the full icon set stays closed until that activity's icon is clicked. It does not say which set. The screen already has a curated list of about twenty icons in `ACTIVITY_TYPE_ICONS`. The full Lucide library would make the "short list" long again. Uploaded icons are already out of scope.

Add to the assumptions: icon choices are the activity icons Configure already shows. This feature does not add icons.

The icon field is the activity's real icon, not a calendar-only copy. Changing it here changes the icon in Settings and in the activity log, because it is the same activity. Say that next to FR-008 so nobody adds a second icon column. Emoji is the field that exists only for this celebration.

### Pin the twelve glyphs

FR-010's names are almost exact. Three of them match more than one common character: bicycle (the bike, or a person riding), two people (a pair of busts, or two figures), mountain (a mountain, or a snow-capped mountain). "Exactly these twelve" is not testable until each name has one character.

Put the characters in FR-010. None stays first. The person still cannot open the system emoji keyboard.

### Hide, Show, and the saved name

- The Hidden heading is absent when nothing is hidden. An empty heading is a switch that was removed and replaced with a blank section.
- Hidden activities are alphabetical too. Show already returns an activity to alphabetical order among the shown ones. The hidden group should use that same order.
- The name saved from Add has surrounding spaces removed. " French " is stored as "French". Comparison already ignores capital letters and surrounding spaces; the stored value should too.
- Enter or Space on a future row or a locked row does not change the mark and does not play a celebration. FR-004 and FR-005 imply this. The row is about to become the button, so the sentence belongs on FR-001.
- Clearing a row removes a celebration that is still on screen. A clear does not start one. A mark that has not finished should not keep playing after the row is quiet again.
- A failed icon, color, emoji, hide, or add does not leave the row looking as if it succeeded.

### Uniqueness belongs on create, not only on this screen

`POST /api/activity-types` trims the name and rejects an empty one. It does not reject "running" when "Running" already exists. FR-017 says a duplicate must not be created and the person must be told the name is used.

Do that on the create API, not only in the calendar form. Settings uses the same create. A client-only check loses a double-click. The Settings page does not need a redesign for the API to return that error.

Store the emoji as empty for every existing activity and every new one. Do not backfill Climbing with a smiling face. The assumptions already say the suggestions are not filled in. The migration has to obey that, including on every later container start. An unguarded update that writes suggested emojis would undo None.

---

## What the plan has to get right

These are not spec edits. They are how the current code will violate the spec if it is left in place.

**Reduced motion currently deletes the celebration.** The day panel skips the animation when `prefers-reduced-motion` is set. `globals.css` also sets `animation: none` on `.calendar-celebrate-motion`. FR-012 wants the emoji to fade in place, not to travel, and not to vanish. The fade needs a path the global rule does not cancel.

**The named motions have to go.** FR-013 is not "play the emoji in addition." `NAMED_CELEBRATIONS` and the sweep, rise, bloom, climb, ring, ink, and ripple keyframes stop. If they stay, a check still plays the old motion.

**Color is already validated. Icon is not.** `PATCH` rejects a palette name it does not know. It stores any string as `icon`. The chooser should be the only way to set an icon, and the API should reject a name that is not in the curated set. Same pattern as color.

**New activities already get a default icon and color.** Create uses the icon `activity` and `defaultCalendarColor`. That matches the assumption that this spec does not invent a palette. The new part is forcing the emoji to empty even if a client sends one on create from this screen.

---

## Adversarial pass

**The complaint is specific, and the spec does not inflate it.** "The day list is boring" could have become a new calendar. It became "the switch is a settings control, and Configure is every choice at once." Both are visible in the current components. The success criteria are clicks, order, one open chooser, one emoji or none, hide, and add. None of them say the screen will feel delightful. That is the right kind of claim.

**Opt-in celebration is the correction the last version skipped.** Calendar 2.0's spec said this page would not score, streak, or prompt. The shipped day list celebrates every check with a motion picked by activity name. This spec deletes that. Good. The risk that remains is the emoji becoming a reward. The bounds hold it: one glyph, under a second, nothing on clear, nothing on failure, nothing if they never choose one, no sound, no count. Do not add a "celebrations on" switch. The spec already excludes it.

**"Light tint" is an easy-to-vary aesthetic.** It does not explain why the name has to be a tint rather than simply readable. The week mark's explanation is "this color is this activity, the icon sits on it in white." Reuse that. A tint recipe can be swapped for another tint recipe and the row is equally "designed," including the unreadable ones.

**Add is correctly rare.** It is P3, name only, no delete. Delete in Configure would be how a person removes history while trying to tidy the list. Hide already does tidy. Keeping delete on the Activity Types page is the error-correction that matters.

**The checklist cannot fail.** It was marked all clear on the day the spec was written. FR-003's text color is not unambiguous, and the icon set is not named. A checklist that passes those is not a check.

---

## What does not need to change

- A mark is still one completion for that activity on that day. The check API stays.
- Future days stay visible and cannot be marked. The current sentence ("Future days cannot be checked yet.") already matches FR-004.
- Watch and detailed sessions stay locked, with an explanation on the row.
- Alphabetical order stays, and a mark does not reorder the row. The list is already sorted by name.
- Hide keeps history. Show brings the marks back.
- One chooser open at a time. Done closes Configure.
- No emoji until the person picks one. None returns to empty.
- No sound, confetti, streak, or celebration count.
- No second activity list. No delete on this screen.
- Week grid, month grid, legend layout, today, and the dashboard week summary stay.
- The helper text is specified exactly. Keep that string.

---

## Required edits before planning

| # | Edit | Where |
|---|---|---|
| 1 | Marked-row icon and name are readable on every palette bar, including yellow and lime. Drop "light tint of the same color." | FR-003, US1 scenario 7 |
| 2 | Day list and Configure change on both This Week and Month. | Assumptions |
| 3 | Icon choices are the existing activity icon set. The icon edited here is the activity's real icon. Emoji is only the celebration. | Assumptions, FR-008 |
| 4 | Write the twelve emoji characters next to their names. | FR-010 |
| 5 | Hidden heading only when something is hidden. Hidden list is alphabetical. Saved names are trimmed. Future and locked rows do not toggle or celebrate. A clear removes an in-flight celebration. A failed save does not look successful. | FR-001, FR-011, FR-014, FR-016 |
| 6 | Duplicate names are rejected by create, case-insensitive, after trim. Existing activities get an empty emoji and stay empty. | FR-017, assumptions |

After those sentences are in the spec, planning can start. No schema or API work before that, because the text-color line will otherwise get built into the row.
