# Tasks: Lucide Icon System Refactor

> Spec: `.specify/specs/lucide-icon-refactor/spec.md`
> Last updated: 2026-03-21

All tasks are additive. No database schema changes. The `icon TEXT` column stays as-is — we only change the string values stored in it.

---

## Phase 1: Icon Registry (`src/lib/icons.ts`)

**Goal**: Create the single source of truth for icon name → Lucide component mapping and curated picker sets.

- [ ] Create `src/lib/icons.ts`
- [ ] Define `CATEGORY_ICONS` array of `{ name: string; label: string }` — include at minimum: `utensils`, `home`, `zap`, `shopping-cart`, `popcorn`, `shirt`, `car`, `piggy-bank`, `arrow-up-from-line`, `package`, `banknote`, `wallet`, `receipt`, `building`, `graduation-cap`, `heart`, `coffee`, `plane`, `gift`, `music`, `monitor`, `phone`, `baby`, `cross`
- [ ] Define `ACTIVITY_TYPE_ICONS` array of `{ name: string; label: string }` — include at minimum: `footprints`, `mountain`, `circle-dot`, `dumbbell`, `mountain-snow`, `book-open`, `wind`, `pen-line`, `users`, `bike`, `waves`, `flame`, `timer`, `activity`, `heart-pulse`, `person-standing`, `zap`, `target`, `trophy`, `leaf`
- [ ] Export `getLucideIcon(name: string): React.ComponentType<LucideProps> | null` — a lookup function that maps kebab-case icon name strings to their Lucide components; returns `null` for unrecognized strings
- [ ] Use a static `Record<string, React.ComponentType>` map populated from explicit named imports (do not use dynamic imports — Next.js requires static imports for tree-shaking)
- [ ] Verify: `getLucideIcon("piggy-bank")` returns the `PiggyBank` Lucide component; `getLucideIcon("🏠")` returns `null`

---

## Phase 2: `LucideIcon` Component (`src/components/ui/lucide-icon.tsx`)

**Goal**: Build a drop-in visual replacement for `EmojiIcon` that renders a Lucide icon by name string, with emoji fallback for legacy values.

- [ ] Create `src/components/ui/lucide-icon.tsx`
- [ ] Props: `name: string`, `size?: "sm" | "md" | "lg"` (default `"md"`), `className?: string`
- [ ] Size classes must exactly mirror `EmojiIcon`: `sm: "size-6"`, `md: "size-8"`, `lg: "size-10"` — wrapper uses same `inline-flex shrink-0 items-center justify-center rounded-md bg-muted/50` styling
- [ ] Behavior: call `getLucideIcon(name)`. If a component is returned, render it inside the wrapper with `className="h-4 w-4"` for sm, `"h-5 w-5"` for md, `"h-6 w-6"` for lg
- [ ] Fallback: if `getLucideIcon(name)` returns `null`, render `<span role="img">{name}</span>` inside the same wrapper — this gracefully displays legacy emoji values without crashing
- [ ] Verify: renders correctly for a known Lucide name; renders emoji character for an unknown string; no prop changes break

---

## Phase 3: `IconPicker` Component (`src/components/ui/icon-picker.tsx`)

**Goal**: Build a reusable icon picker grid used in the category and activity type forms.

- [ ] Create `src/components/ui/icon-picker.tsx`
- [ ] Props: `icons: { name: string; label: string }[]`, `value: string`, `onChange: (name: string) => void`, `className?: string`
- [ ] Render a responsive `grid grid-cols-6 gap-1` (or `grid-cols-5` — whichever looks better in a dialog)
- [ ] Each cell is a `<button type="button">` containing a `LucideIcon` at `size="sm"`, with a `title={label}` tooltip
- [ ] Selected icon: `ring-2 ring-primary bg-primary/10` highlight on the cell
- [ ] Unselected: `hover:bg-muted rounded-md p-1.5 transition-colors`
- [ ] Export as `IconPicker`

---

## Phase 4: Defaults and API Fallbacks

**Goal**: Update all hardcoded default values from emoji to Lucide names.

- [ ] In `src/lib/defaults.ts`, update `DEFAULT_SPENDING_CATEGORIES`: replace emoji strings with Lucide names per the icon mapping table in the spec
- [ ] In `src/lib/defaults.ts`, update `DEFAULT_ACTIVITY_TYPES`: replace emoji strings with Lucide names per the icon mapping table in the spec
- [ ] In `src/app/api/spending-categories/route.ts`, update the POST fallback: `icon ?? "📦"` → `icon ?? "package"`
- [ ] In `src/app/api/spending-categories/route.ts`, update the seed insert fallback: `icon: cat.icon` — no change needed since `cat.icon` comes from the updated `DEFAULT_SPENDING_CATEGORIES`
- [ ] In `src/app/api/activity-types/route.ts`, update the POST fallback: `icon ?? "🏃"` → `icon ?? "activity"`
- [ ] In `src/app/api/activity-types/route.ts`, update the seed insert — no change needed since it reads from the updated `DEFAULT_ACTIVITY_TYPES`

---

## Phase 5: Form Updates (Icon Picker Integration)

**Goal**: Replace emoji pickers in both forms with the new `IconPicker` component.

### `src/components/budget/categories-page.tsx`

- [ ] Remove the `EMOJI_OPTIONS` constant at the top of the file
- [ ] Import `IconPicker` from `@/components/ui/icon-picker` and `CATEGORY_ICONS` from `@/lib/icons`
- [ ] Replace the `EmojiIcon` import with `LucideIcon` from `@/components/ui/lucide-icon`
- [ ] In the form dialog, replace the emoji grid (the `{EMOJI_OPTIONS.map(...)}` block) with `<IconPicker icons={CATEGORY_ICONS} value={icon} onChange={setIcon} />`
- [ ] Update the `openAdd` default: `setIcon("📦")` → `setIcon("package")`
- [ ] Update the `handleSubmit` fallback: `icon || "📦"` → `icon || "package"`
- [ ] In the category card, replace `<EmojiIcon emoji={cat.icon} size="lg" />` with `<LucideIcon name={cat.icon} size="lg" />`

### `src/components/activities/sport-form.tsx`

- [ ] Remove the `ACTIVITY_ICONS` constant at the top of the file
- [ ] Import `IconPicker` from `@/components/ui/icon-picker` and `ACTIVITY_TYPE_ICONS` from `@/lib/icons`
- [ ] In the form, find the icon `Select` dropdown (currently renders emoji `SelectItem` entries) and replace the entire icon field section with `<IconPicker icons={ACTIVITY_TYPE_ICONS} value={icon} onChange={setIcon} />`
- [ ] Update the initial `icon` state default: `activityType?.icon ?? "🏃"` → `activityType?.icon ?? "footprints"`
- [ ] Update `handleOpenChange` reset: `setIcon(activityType?.icon ?? "🏃")` → `setIcon(activityType?.icon ?? "footprints")`
- [ ] Remove any now-unused `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` imports if they are only used by the icon select (do not remove them if they are used elsewhere in the form)

---

## Phase 6: Rendering Updates (EmojiIcon → LucideIcon)

**Goal**: Replace all `EmojiIcon` usages with `LucideIcon` across the 12 remaining component files. Each file follows the same pattern: swap the import, swap the component name, rename prop `emoji` → `name`.

### Budget components

- [ ] `src/components/budget/spending-log.tsx` — 3 usages:
  - Quick-add select: `<EmojiIcon emoji={c.icon} size="sm" />` → `<LucideIcon name={c.icon} size="sm" />`
  - Log list row: `<EmojiIcon emoji={cat?.icon ?? "📦"} size="sm" />` → `<LucideIcon name={cat?.icon ?? "package"} size="sm" />`
  - Edit dialog select: same pattern as quick-add
- [ ] `src/components/budget/fixed-costs-view.tsx` — 1 usage: category select `EmojiIcon` → `LucideIcon`
- [ ] `src/components/budget/budget-goals.tsx` — 2 usages:
  - Planned expense category select: `EmojiIcon` → `LucideIcon`
  - Planned expense table row: `${exp.categoryIcon ?? ""} ${exp.categoryName}` → render `<LucideIcon name={exp.categoryIcon ?? "package"} size="sm" />` inline before `exp.categoryName` (remove string interpolation, use JSX)

### Activity components

- [ ] `src/components/activities/sports-page.tsx` — 1 usage: activity type card `EmojiIcon` → `LucideIcon`
- [ ] `src/components/activities/workout-log.tsx` — 2 usages:
  - Log list row: `<EmojiIcon emoji={w.activityTypeIcon ?? "📋"} />` → `<LucideIcon name={w.activityTypeIcon ?? "activity"} />`
  - Activity type select: `EmojiIcon` → `LucideIcon`
- [ ] `src/components/activities/activities-dashboard.tsx` — 2 usages:
  - Streaks list: `<EmojiIcon emoji={s.activityTypeIcon} />` → `<LucideIcon name={s.activityTypeIcon} />`
  - Recent activities list: `<EmojiIcon emoji={w.activityTypeIcon} size="sm" />` → `<LucideIcon name={w.activityTypeIcon} size="sm" />`

### Goals components

- [ ] `src/components/goals/goals-page.tsx` — 2 usages:
  - Dashboard view activity type badge: `<EmojiIcon emoji={goal.activityTypeIcon} size="sm" />` → `<LucideIcon name={goal.activityTypeIcon} size="sm" />`
  - List view activity type badge: same
- [ ] `src/components/goals/yearly-goal-card.tsx` — 1 usage: goal title row `EmojiIcon` → `LucideIcon`
- [ ] `src/components/goals/goal-form-standalone.tsx` — 1 usage: activity type select `EmojiIcon` → `LucideIcon`

### Calendar and Daily components

- [ ] `src/components/monthly-plan/activity-form.tsx` — 1 usage: activity type select `EmojiIcon` → `LucideIcon`
- [ ] `src/components/daily/daily-view.tsx` — 2 usages:
  - Log dialog activity type select: `EmojiIcon` → `LucideIcon`
  - Completed activity row: `<EmojiIcon emoji={log.activityTypeIcon ?? "📋"} />` → `<LucideIcon name={log.activityTypeIcon ?? "activity"} />`

---

## Phase 7: Data Migration and Cleanup

**Goal**: Migrate existing database records from emoji to Lucide names; remove the deprecated `EmojiIcon` component.

### `apply-schema.js` — migration UPDATE statements

- [ ] After the existing `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS` blocks, add a new section: `-- Migrate emoji icons to Lucide names`
- [ ] Add `UPDATE` statements for each default spending category, keyed by `name` column value, for rows that still have the old emoji value. **Note on ordering**: the "Savings" and "Savings Withdrawal" UPDATE statements depend on the `savings-redesign` feature having seeded those two categories first. If `savings-redesign` has not been deployed, the two Savings-category UPDATEs will silently no-op (rows don't exist yet). They will activate automatically on the next `apply-schema.js` run after `savings-redesign` ships. No special handling is needed — the `AND icon = 'emoji'` condition makes all statements idempotent regardless of order.
  ```js
  db.exec(`UPDATE spending_categories SET icon = 'utensils' WHERE name = 'Food' AND icon = '🍕'`);
  db.exec(`UPDATE spending_categories SET icon = 'home' WHERE name = 'Rent' AND icon = '🏠'`);
  db.exec(`UPDATE spending_categories SET icon = 'zap' WHERE name = 'Utilities' AND icon = '⚡'`);
  db.exec(`UPDATE spending_categories SET icon = 'shopping-cart' WHERE name = 'Groceries' AND icon = '🛒'`);
  db.exec(`UPDATE spending_categories SET icon = 'popcorn' WHERE name = 'Amusement' AND icon = '🎭'`);
  db.exec(`UPDATE spending_categories SET icon = 'shirt' WHERE name = 'Clothes' AND icon = '👕'`);
  db.exec(`UPDATE spending_categories SET icon = 'car' WHERE name = 'Transport' AND icon = '🚗'`);
  db.exec(`UPDATE spending_categories SET icon = 'piggy-bank' WHERE name = 'Savings' AND icon = '🏦'`);
  db.exec(`UPDATE spending_categories SET icon = 'arrow-up-from-line' WHERE name = 'Savings Withdrawal' AND icon = '💸'`);
  db.exec(`UPDATE spending_categories SET icon = 'package' WHERE name = 'Other' AND icon = '📦'`);
  ```
- [ ] Add `UPDATE` statements for each default activity type:
  ```js
  db.exec(`UPDATE activity_types SET icon = 'footprints' WHERE name = 'Running' AND icon = '🏃'`);
  db.exec(`UPDATE activity_types SET icon = 'mountain' WHERE name = 'Hiking' AND icon = '🥾'`);
  db.exec(`UPDATE activity_types SET icon = 'circle-dot' WHERE name = 'Tennis' AND icon = '🎾'`);
  db.exec(`UPDATE activity_types SET icon = 'dumbbell' WHERE name = 'Climbing (Gym)' AND icon = '🧗'`);
  db.exec(`UPDATE activity_types SET icon = 'mountain-snow' WHERE name = 'Climbing (Outdoor)' AND icon = '⛰️'`);
  db.exec(`UPDATE activity_types SET icon = 'book-open' WHERE name = 'Reading' AND icon = '📖'`);
  db.exec(`UPDATE activity_types SET icon = 'wind' WHERE name = 'Meditation' AND icon = '🧘'`);
  db.exec(`UPDATE activity_types SET icon = 'pen-line' WHERE name = 'Journaling' AND icon = '📝'`);
  db.exec(`UPDATE activity_types SET icon = 'users' WHERE name = 'Social Event' AND icon = '🤝'`);
  ```
- [ ] Verify: the UPDATE statements are idempotent — if the emoji is already replaced, the `AND icon = 'emoji'` condition ensures no double-update

### `src/components/ui/emoji-icon.tsx`

- [ ] After all usages of `EmojiIcon` are confirmed replaced (zero importers), delete `emoji-icon.tsx`
- [ ] Verify using a project-wide search: no file imports `emoji-icon` or `EmojiIcon` after deletion

---

## Verification Checklist

After all phases are complete, manually verify each of these scenarios in the running app:

- [ ] Budget → Categories: all default categories show Lucide icons
- [ ] Budget → Log Spending: category dropdown shows Lucide icons inline
- [ ] Budget → Fixed Costs: category dropdown shows Lucide icons inline
- [ ] Budget → Budget Goals (Planned Expenses): table rows show Lucide icons (not raw emoji strings)
- [ ] Budget → Add Category dialog: `IconPicker` shows Lucide grid; selection highlights and saves correctly
- [ ] Activities → Activity Types: all default activity types show Lucide icons
- [ ] Activities → Log Activity: activity type dropdown shows Lucide icons
- [ ] Activities → Dashboard: streaks and recent activities show Lucide icons
- [ ] Goals → Dashboard view: activity type badges show Lucide icons
- [ ] Goals → List view: activity type badges show Lucide icons
- [ ] Goals → Yearly Goal Card: activity type icon next to title is Lucide
- [ ] Goals → Goal form: activity type dropdown shows Lucide icons
- [ ] Monthly Plan: activity form activity type dropdown shows Lucide icons
- [ ] Today view: log dialog shows Lucide icons; completed activities section shows Lucide icons
- [ ] Activity Types → Add dialog: `IconPicker` shows Lucide grid; selection highlights and saves correctly
- [ ] Legacy emoji value: create a test category with an emoji icon directly in the DB; verify it renders the emoji character without crashing
