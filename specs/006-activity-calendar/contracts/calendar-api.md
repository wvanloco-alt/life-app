# Contract: Activity Calendar API

**Feature**: `006-activity-calendar`
**Date**: 2026-10-04

Every route calls `auth()` and scopes queries with the session user id. No session returns `401`.

## `GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`

Returns the activity list and the marks from `from` through `to`, inclusive. The week view requests Monday through Sunday. The month view requests the first through the last day of the month. Hidden activities are included so the configure panel can turn them back on. Marks include only visible activities.

**Response `200`**:

```json
{
  "from": "2026-10-01",
  "to": "2026-10-31",
  "activities": [
    { "id": 4, "name": "Climbing (Gym)", "icon": "mountain", "color": "red", "visible": true }
  ],
  "days": [
    {
      "date": "2026-10-04",
      "completions": [
        { "activityTypeId": 4, "locked": false }
      ]
    }
  ]
}
```

`locked` is true when a manual or Garmin log exists for that activity and date.

**Response `400`**: `from` or `to` missing, not `YYYY-MM-DD`, or `from` after `to`.

## `PUT /api/calendar/check`

Checks or unchecks one activity on one date.

**Request**:

```json
{ "date": "2026-10-04", "activityTypeId": 4, "checked": true }
```

**Behavior**:
- `checked: true` inserts a `calendar` log only if no log exists for that user, type, and date. If one exists, it does nothing.
- `checked: false` deletes `calendar` logs for that user, type, and date. Manual and Garmin logs are not deleted. If one of those remains, the completion stays locked.
- Date must be `YYYY-MM-DD` and must not be after today in `Europe/Brussels` (`toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" })`). Otherwise `400`. The grid highlights that same date.
- Activity type must belong to the user and be visible. Otherwise `404` or `400` if it is hidden.

**Response `200`**:

```json
{ "date": "2026-10-04", "activityTypeId": 4, "checked": true, "locked": false }
```

## `PATCH /api/activity-types/:id`

Existing route. Accepts two new optional fields:

```json
{ "calendarVisible": false, "calendarColor": "blue" }
```

`calendarColor` must be one of the palette names. Anything else returns `400`. The response includes `calendarVisible` and `calendarColor`.

`POST /api/activity-types` sets `calendar_visible = 1` and assigns a default palette color when the client does not send one.

## Dashboard `GET /api/dashboard`

`activities.thisWeek` is the count of distinct activity-type-and-date pairs from Monday of the current week through today in `Europe/Brussels`, not the raw log count. Monday is derived from that Brussels date. `activities.kmRunThisWeek` is unchanged. Sleep and calories are unchanged. Digest totals and goal session counts are unchanged and still count rows.

## Activity summary `GET /api/activities/summary`

Recent workouts include `source`. A `calendar` row is still a workout. The client labels it "Checked" when duration is 0.
