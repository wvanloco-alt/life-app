# Feature Specification: Lucide Icon System Refactor

**Spec ID**: `lucide-icon-refactor`
**Created**: 2026-03-21
**Status**: Draft

---

## Overview

The app currently uses emoji strings to represent icons for two data types: spending categories and activity types. Both systems store an arbitrary emoji character in an `icon TEXT` column and render it via a custom `EmojiIcon` component.

This works, but it conflicts with the design system's core principle: use Lucide for UI icons. The tension is real — emoji render inconsistently at small sizes, vary across operating systems, and undermine the calm, premium aesthetic the app is built around. Every other icon in the UI is already a Lucide icon (navigation, actions, buttons, empty states). The category and activity type icons are the only remaining exception.

This feature replaces emoji icons in both subsystems with named Lucide icons. It introduces:

1. A curated set of Lucide icon names for each subsystem.
2. A `LucideIcon` component that renders a Lucide icon by name string, with graceful fallback to emoji for any user-created record that still has an emoji value.
3. A shared `IconPicker` component used in the category creation form and the activity type form.
4. Updated default definitions in `defaults.ts`.
5. A data migration in `apply-schema.js` that updates the default-seeded records in the database from emoji to Lucide names.

No schema changes are required. The `icon TEXT` column already stores a string — Lucide icon names are strings.

---

## Design Principles

This refactor is guided directly by the app's design system:

- **Lucide for all UI icons**: "Use Lucide icons for UI/system icons — buttons, navigation, actions." Category and activity type icons are UI icons — they identify data types in lists, selects, and cards. They fall under this rule.
- **Emoji for user-authored content only**: User-typed notes, book titles, and free-form descriptions can contain emoji. A structured data field representing a category's visual identity should not.
- **Warm, premium, cohesive**: Lucide icons are consistent in weight, size, and visual language across the app. Emoji are not.

---

## Scope

### What is changing

- `spending_categories.icon`: from emoji character → Lucide icon name string (e.g., `"piggy-bank"`)
- `activity_types.icon`: from emoji character → Lucide icon name string (e.g., `"footprints"`)
- The `EmojiIcon` component: deprecated and eventually removed
- The emoji picker UI in `categories-page.tsx` and `sport-form.tsx`: replaced with `IconPicker`
- All components that render `EmojiIcon`: updated to render `LucideIcon`

### What is not changing

- The `icon TEXT` column in the database (no schema migration)
- Any other icon in the app (navigation, actions, empty states — already Lucide)
- The `color` field on spending categories (unchanged)
- All other fields on both entities

---

## Icon Mapping

These are the Lucide icon names assigned to each default entry.

### Spending Categories

| Category | Emoji (before) | Lucide name (after) | Lucide component |
|---|---|---|---|
| Food | 🍕 | `utensils` | `Utensils` |
| Rent | 🏠 | `home` | `Home` |
| Utilities | ⚡ | `zap` | `Zap` |
| Groceries | 🛒 | `shopping-cart` | `ShoppingCart` |
| Amusement | 🎭 | `popcorn` | `Popcorn` |
| Clothes | 👕 | `shirt` | `Shirt` |
| Transport | 🚗 | `car` | `Car` |
| Savings | 🏦 | `piggy-bank` | `PiggyBank` |
| Savings Withdrawal | 💸 | `arrow-up-from-line` | `ArrowUpFromLine` |
| Other | 📦 | `package` | `Package` |

### Activity Types

| Activity Type | Emoji (before) | Lucide name (after) | Lucide component |
|---|---|---|---|
| Running | 🏃 | `footprints` | `Footprints` |
| Hiking | 🥾 | `mountain` | `Mountain` |
| Tennis | 🎾 | `circle-dot` | `CircleDot` |
| Climbing (Gym) | 🧗 | `dumbbell` | `Dumbbell` |
| Climbing (Outdoor) | ⛰️ | `mountain-snow` | `MountainSnow` |
| Reading | 📖 | `book-open` | `BookOpen` |
| Meditation | 🧘 | `wind` | `Wind` |
| Journaling | 📝 | `pen-line` | `PenLine` |
| Social Event | 🤝 | `users` | `Users` |

---

## User Stories & Acceptance Scenarios

### User Story 1 — Category icons are Lucide (Priority: P1)

As a user, when I view my spending categories, I see clean Lucide icons instead of emoji — consistent with every other icon in the app.

**Independent Test**: Open the Budget → Categories tab. Verify all category cards display Lucide icons, not emoji.

**Acceptance Scenarios**:

1. **Given** the app has default spending categories, **When** the Categories tab loads, **Then** each card shows the assigned Lucide icon at the correct size and with the existing rounded background treatment.
2. **Given** a category with a legacy emoji icon (user-created before the refactor), **When** it is displayed, **Then** it renders without error — either showing the emoji as a fallback character or a neutral placeholder icon.
3. **Given** any list that shows category icons (Log Spending, Fixed Costs, Planned Expenses), **When** a category is selected, **Then** the Lucide icon appears inline next to the category name.

---

### User Story 2 — Activity type icons are Lucide (Priority: P1)

As a user, when I view my activity types or any list that shows them (Activities dashboard, Goals, Monthly Plan, Today view), I see Lucide icons.

**Independent Test**: Open the Activities → Activity Types tab. Verify all type cards show Lucide icons.

**Acceptance Scenarios**:

1. **Given** the app has default activity types, **When** the Activity Types page loads, **Then** each card shows the assigned Lucide icon.
2. **Given** any select dropdown that lists activity types (Log Activity form, Goal form, Calendar form, Today log dialog), **When** it is opened, **Then** each option shows a Lucide icon inline with the type name.
3. **Given** an activity log in the Activities dashboard or Today view, **When** it is displayed in the recent activities list or streaks section, **Then** it shows a Lucide icon.
4. **Given** a goal linked to an activity type, **When** it appears on the Goals page or Yearly Goal card, **Then** the activity type badge uses a Lucide icon.

---

### User Story 3 — Icon picker uses Lucide (Priority: P1)

As a user, when I create or edit a spending category or activity type, I pick from a grid of Lucide icons instead of a grid of emoji.

**Independent Test**: Open Add Category dialog. Verify the icon picker shows a grid of Lucide icons. Select one. Verify it is saved and displayed correctly.

**Acceptance Scenarios**:

1. **Given** the Add Category or Edit Category dialog is open, **When** the icon picker renders, **Then** it shows a curated grid of Lucide icons for spending categories (Food, Home, Transport, Finance etc.).
2. **Given** the Add Activity Type or Edit Activity Type dialog is open, **When** the icon picker renders, **Then** it shows a curated grid of Lucide icons for physical activities and wellness (running, strength, nature, etc.).
3. **Given** I click an icon in the picker, **When** the selection is made, **Then** the selected icon is visually highlighted and the form state updates.
4. **Given** I save the form, **When** the record is created or updated, **Then** the Lucide icon name string is stored in the `icon` column and renders correctly in all views.

---

### User Story 4 — Existing data is not lost (Priority: P1)

As an existing user, when the app updates, I do not lose my custom categories or activity types. Default-seeded records are migrated automatically.

**Acceptance Scenarios**:

1. **Given** the `apply-schema.js` runs on container startup, **When** a default category has an emoji icon value, **Then** the script updates it to the corresponding Lucide name.
2. **Given** a user-created category still has an emoji icon, **When** it is displayed, **Then** it renders without crashing (graceful fallback in `LucideIcon`).
3. **Given** a user edits a legacy emoji category, **When** they save with a new icon from the picker, **Then** the Lucide name replaces the emoji and renders correctly from then on.

---

## Key Components

### `src/lib/icons.ts`

Central icon registry. Exports:

- `CATEGORY_ICONS`: array of `{ name: string; label: string }` covering spending category icon options
- `ACTIVITY_TYPE_ICONS`: array of `{ name: string; label: string }` covering activity type icon options
- `getLucideIcon(name: string): LucideIcon | null`: looks up a Lucide component by its kebab-case name string; returns `null` for unrecognized strings (used for fallback detection)

Both arrays are curated — larger than the 10 or 9 defaults to give users real choice when creating custom records, but small enough to keep the picker scannable (target: 20–30 icons per set).

### `src/components/ui/lucide-icon.tsx`

Drop-in visual replacement for `EmojiIcon`. Props: `name: string`, `size?: "sm" | "md" | "lg"`, `className?: string`.

Behavior:
- Calls `getLucideIcon(name)`. If a Lucide component is found, renders it inside the same rounded background container as `EmojiIcon`.
- If `getLucideIcon` returns `null` (legacy emoji or unknown string), renders the raw string as a character inside the same container (graceful fallback — no crashes, no broken layouts).
- Size classes mirror `EmojiIcon` exactly so it is a true drop-in replacement.

### `src/components/ui/icon-picker.tsx`

Reusable icon picker grid. Props: `icons: { name: string; label: string }[]`, `value: string`, `onChange: (name: string) => void`.

Renders a responsive grid of `LucideIcon` buttons. Selected icon has a `ring-2 ring-primary` highlight. Used in both `categories-page.tsx` and `sport-form.tsx`.

---

## Files Changed

### New files

| File | Purpose |
|---|---|
| `src/lib/icons.ts` | Icon registry and lookup function |
| `src/components/ui/lucide-icon.tsx` | Rendering component (replaces `EmojiIcon`) |
| `src/components/ui/icon-picker.tsx` | Picker grid component |

### Modified files

| File | Change |
|---|---|
| `src/lib/defaults.ts` | Replace emoji strings with Lucide names in `DEFAULT_SPENDING_CATEGORIES` and `DEFAULT_ACTIVITY_TYPES` |
| `apply-schema.js` | Add UPDATE statements to migrate default emoji → Lucide names in existing DBs |
| `src/app/api/spending-categories/route.ts` | Fallback default: `"📦"` → `"package"` |
| `src/app/api/activity-types/route.ts` | Fallback default: `"🏃"` → `"activity"` |
| `src/components/budget/categories-page.tsx` | Replace `EMOJI_OPTIONS` grid and `EmojiIcon` with `IconPicker` and `LucideIcon` |
| `src/components/activities/sport-form.tsx` | Replace `ACTIVITY_ICONS` emoji select and `EmojiIcon` with `IconPicker` and `LucideIcon` |
| `src/components/budget/spending-log.tsx` | Replace `EmojiIcon` (3 usages) with `LucideIcon` |
| `src/components/budget/fixed-costs-view.tsx` | Replace `EmojiIcon` (1 usage) with `LucideIcon` |
| `src/components/budget/budget-goals.tsx` | Replace `EmojiIcon` (1 usage) + raw string rendering with `LucideIcon` |
| `src/components/activities/sports-page.tsx` | Replace `EmojiIcon` (1 usage) with `LucideIcon` |
| `src/components/activities/workout-log.tsx` | Replace `EmojiIcon` (2 usages) with `LucideIcon` |
| `src/components/activities/activities-dashboard.tsx` | Replace `EmojiIcon` (2 usages) with `LucideIcon` |
| `src/components/goals/goals-page.tsx` | Replace `EmojiIcon` (2 usages) with `LucideIcon` |
| `src/components/goals/yearly-goal-card.tsx` | Replace `EmojiIcon` (1 usage) with `LucideIcon` |
| `src/components/goals/goal-form-standalone.tsx` | Replace `EmojiIcon` (1 usage) with `LucideIcon` |
| `src/components/monthly-plan/activity-form.tsx` | Replace `EmojiIcon` (1 usage) with `LucideIcon` |
| `src/components/daily/daily-view.tsx` | Replace `EmojiIcon` (2 usages) with `LucideIcon` |
| `src/components/ui/emoji-icon.tsx` | Mark deprecated |

---

## Schema Changes

None. The `icon TEXT` column is unchanged. Lucide icon name strings (e.g., `"piggy-bank"`) are valid values for the existing column.

---

## Success Criteria

- **SC-001**: All default spending category icons render as Lucide icons after a fresh database start.
- **SC-002**: All default activity type icons render as Lucide icons after a fresh database start.
- **SC-003**: An existing user who upgrades sees default categories and activity types automatically migrated (via `apply-schema.js`), with no manual action required.
- **SC-004**: A user-created category with a legacy emoji icon does not crash — it renders its emoji as a fallback character.
- **SC-005**: The category creation dialog shows a Lucide icon picker. Saving the form stores a Lucide name string and renders correctly in all views.
- **SC-006**: The activity type creation dialog shows a Lucide icon picker. Saving the form stores a Lucide name string and renders correctly in all views.
- **SC-007**: No visual regression in any list, card, select, or badge that previously rendered `EmojiIcon`.
- **SC-008**: `emoji-icon.tsx` has zero remaining importers after the refactor is complete.
