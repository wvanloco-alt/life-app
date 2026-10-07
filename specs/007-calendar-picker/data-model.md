# Data model: Calendar Picker

No new table. One new column on the activity the calendar already uses.

## Activity type

Existing table: `activity_types`.

| Field | Stored as | Rules |
|---|---|---|
| `calendar_celebration` | `TEXT`, null | Null, or one of the tokens below. Empty string is not stored; the writer saves null instead. Existing rows stay null. Later boots do not fill a default. |

Drizzle name: `calendarCelebration`.

Tokens and the character the screen shows:

| Token | Character | Plain name |
|---|---|---|
| `smile` | 😊 | smiling face |
| `meditate` | 🧘 | person meditating |
| `flex` | 💪 | flexed biceps |
| `runner` | 🏃 | runner |
| `bicycle` | 🚴 | bicycle |
| `tennis` | 🎾 | tennis |
| `mountain` | ⛰️ | mountain |
| `book` | 📖 | open book |
| `write` | ✍️ | writing hand |
| `people` | 👥 | two people |
| `seedling` | 🌱 | seedling |
| `sun` | ☀️ | sun |

The column does not change `icon`, `calendar_color`, or `calendar_visible`. Adding the column does not fill a token. A later startup does not fill one either. Suggested characters stay unassigned until a person picks one.

## Daily mark

Unchanged. A check is still an `activity_logs` row. This feature does not add a column there. The emoji is not stored on the mark. Changing the emoji does not rewrite past days. The next mark plays whatever the activity currently has.

## Validation

- Create: name required after trim. For that `user_id`, no other activity whose trimmed lower-case name matches. Icon, color, and visibility use the defaults `POST /api/activity-types` already sets. Celebration is null.
- Update celebration: `null` clears. A token must be in the table above. Any other value is rejected.
- Hide and show: existing `calendar_visible` boolean. Hiding does not delete logs.

## State

```text
celebration null  --mark-->  no emoji plays
celebration token --mark-->  that character plays once
celebration token --clear--> nothing plays
celebration token --set null--> next mark plays nothing
```

A failed mark does not change the stored token. It only removes the character that was on screen.
