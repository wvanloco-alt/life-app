# Contract: Calendar Picker

Extends the calendar and activity-type routes. Check and uncheck are unchanged.

## GET /api/calendar

Query `from` and `to` stay as they are.

Each activity gains one field:

```json
{
  "id": 1,
  "name": "Running",
  "icon": "footprints",
  "color": "blue",
  "visible": true,
  "celebration": null
}
```

`celebration` is `null` or one of: `smile`, `meditate`, `flex`, `runner`, `bicycle`, `tennis`, `mountain`, `book`, `write`, `people`, `seedling`, `sun`.

A stored value outside that list is returned as `null`.

Hidden activities are still included, with `visible: false`, so Configure can list them under Hidden.

## PATCH /api/activity-types/:id

Existing fields stay. New field:

```json
{ "calendarCelebration": "smile" }
```

`null` clears it.

| Case | Result |
|---|---|
| Missing field | Column unchanged. |
| `null` | Column set to null. |
| A token from the list | Column set to that token. |
| Any other value, including `""` | 400. Body: `{ "error": "calendarCelebration must be a celebration emoji or null" }`. |
| `icon` present and not a name in the existing activity-icon set | 400. Body: `{ "error": "icon must be an activity icon" }`. Icons already stored are not rewritten by this check. |
| Activity belongs to someone else, or no session | Unchanged: 404 or 401. |

Color and `calendarVisible` keep their current validation.

## POST /api/activity-types

`{ "name": "French" }` is enough. The stored name is the trimmed name. The route still fills icon, color, and visibility the way it does today. `calendarCelebration` is stored null even if the body includes one.

| Case | Result |
|---|---|
| Missing, blank, or non-string name | 400, as today. |
| Trimmed lower-case name matches one this user already has | 409. Body: `{ "error": "That name is already used." }`. |
| New name | 201, and the activity is visible on the calendar. |

"Running" and " running " are the same name. Another user's "Running" is not a conflict.

## PUT /api/calendar/check

No change. The emoji is not sent here. The client plays it after this call succeeds, and only when the action was a check and `celebration` is non-null.
