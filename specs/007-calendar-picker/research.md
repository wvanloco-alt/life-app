# Research: Calendar Picker

## 1. Where the emoji lives

**Decision:** One nullable column, `activity_types.calendar_celebration`, storing a token (`smile`, `meditate`, `flex`, `runner`, `bicycle`, `tennis`, `mountain`, `book`, `write`, `people`, `seedling`, `sun`). Null means off.

**Rationale:** The emoji belongs to the activity, like the icon and the color. A token keeps the database free of emoji encoding and gives the API one list to reject against. The character is rendered in one module.

**Alternatives considered:** Storing the character itself (harder to validate, easy to save a lookalike). A second table of celebrations (a new concept for one optional field). A master switch plus a column (the spec removed the master switch). Pre-filling the suggested emoji (the spec says the slot starts empty).

## 2. How a row records the day

**Decision:** The row is a button. Unchecked is a quiet line with the icon drawn in the activity color. Checked is the colored bar with a white icon and a white name, the same treatment as the week mark. Locked rows are not buttons.

**Rationale:** A switch is a settings control. The week already says "done" with a colored bar, so the list should say it the same way. A real button gives Enter and Space without extra keyboard code.

**Alternatives considered:** Keeping the switch and only enlarging the icon (the request rejected the switch). A checkbox (still a form control beside the name, which is the layout they called boring).

## 3. One chooser at a time

**Decision:** Configure holds a single `{ activityId, kind }` or null. Icon, color, and emoji all use it.

**Rationale:** The current screen is chaotic because every icon and every color is open for every activity. Closing the previous chooser is the whole fix. No popover library is required; the choices render under that row.

**Alternatives considered:** A modal per activity (the design skill and this app both avoid modals for a small choice). Leaving all three sets open (returns the wall of red squares).

## 4. Adding an activity

**Decision:** Reuse `POST /api/activity-types` with `{ name }` only. Add a per-user, case-insensitive duplicate check on that route. Do not add a calendar-only create endpoint.

**Rationale:** The spec says the new activity is a normal activity, including in Settings. The route already defaults the icon, the color, and visibility. The missing piece is the duplicate name, which Settings would otherwise still allow.

**Alternatives considered:** A new `POST /api/calendar/activities` (a second door onto the same table). Creating from the client with a generated icon and color (duplicates the server defaults and can drift).

## 5. What happens to the current motions

**Decision:** Delete them. Playback is the chosen character or nothing.

**Rationale:** Calendar 2.0 plays a motion on every check. This spec replaces that rule. Leaving both would celebrate twice, and the motions play when the emoji is empty, which violates the starting state.

**Alternatives considered:** Keeping the motions behind the emoji (two celebration systems). Playing the motion only when an emoji is set (the spec asks for the emoji, not a colored sweep).
