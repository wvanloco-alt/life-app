# Feature Specification: First-Time Onboarding Wizard

**Spec ID**: `onboarding-wizard`
**Created**: 2026-03-19
**Status**: Specified (reviewed, refined)
**Input**: User request for a guided first-run experience.

> "When users first open the app, we should walk them through the app explaining what roles and activities are."

---

## Overview

The Life App currently drops new users into an empty Today page with no guidance. There are no roles, no activity types, no goals, and no explanation of what any of these concepts mean. The onboarding wizard solves this by walking the user through four steps on first launch:

1. **Roles**: Explain the concept (life areas you want to track), show the Covey defaults, let the user pick which ones they want.
2. **Activity Types**: Show the default activity types with an explanation that they can be configured later. Seed them.
3. **Working Hours**: Configure work days and time windows so the scheduler knows when to plan activities.
4. **Feature Overview**: A summary screen explaining how Roles → Goals → Activities fit together, plus a mention of the Budget tracker.

After completing (or skipping) the wizard, the user lands on the Today page with roles, activity types, and scheduler settings already configured -- ready to create their first goal.

### Key Concepts

- **Onboarding Flag**: A boolean `hasCompletedOnboarding` column on the `scheduler_settings` table (the existing app-wide singleton). When `false` or when the row doesn't exist, the wizard is shown.
- **Skippable**: The user can skip the wizard at any step. Skipping sets the flag to `true` and lands on the Today page. No roles or activity types are seeded if skipped.
- **Re-accessible**: A "Run Setup Wizard" button in Settings allows the user to re-run the wizard at any time (resets the flag, clears and re-seeds if desired).
- **Step Navigation**: Back/Next/Skip controls. Each step is self-contained. The wizard does not require completing all steps -- the user can skip ahead or bail out.

---

## Clarifications

### Session 2026-03-19

- Q: Where does the wizard live? → A: A full-page overlay/modal that covers the app on first visit. Not a separate route -- it renders on top of whatever page the user lands on (which is `/today`).
- Q: Should the user be able to customize roles during onboarding, or just toggle defaults? → A: Toggle defaults on/off. Custom role creation can wait until after onboarding (the Roles settings page already supports it).
- Q: Should activity types be auto-seeded or require confirmation? → A: Show the defaults with checkboxes (all checked by default). The user can uncheck ones they don't need. This is better than dumping 9 activity types on someone who only does tennis and reading.
- Q: What if the user already has data (e.g., they reset the flag manually)? → A: The wizard checks for existing roles and activity types. If they exist, it shows them as already selected and skips seeding duplicates.

### Review 2026-03-19 (post-spec)

- Q: What happens if the user creates roles in step 1, goes back, then un-selects one? → A: **Next only adds, never deletes.** Roles/activity types that already exist in the database are shown as locked (disabled checkbox with a subtle "already created" indicator). Un-checking is only possible for records not yet in the database. This prevents accidental data loss and keeps the wizard additive.
- Q: Where does the wizard render -- `layout.tsx` or `today/page.tsx`? → A: A client-side `<OnboardingGate />` wrapper component is added to `layout.tsx`. It wraps `{children}`, fetches `hasCompletedOnboarding` on mount, and conditionally renders the wizard overlay. The server layout itself is unchanged.
- Q: The `scheduler_settings` API auto-creates a row on first GET. Does this affect the wizard? → A: No. The auto-created row has `hasCompletedOnboarding = false` (column default), so the wizard still triggers. Step 3 PATCHes the existing row rather than INSERTing.
- Q: Where does the "Run Setup Wizard" button go? The current `/settings` page is just a redirect. → A: Replace the redirect with an actual settings landing page that shows a "Run Setup Wizard" card/button, plus links to the sub-sections (Roles, Activity Types, Scheduler).
- Q: Should roles created during onboarding have `displayOrder` set? → A: Yes. Roles are created with sequential `displayOrder` values (0, 1, 2, ...) matching the order shown in the wizard.
- Q: How does deduplication work for re-runs? → A: The wizard fetches existing roles (by name) and activity types (by name) before rendering. Matches are shown as pre-selected and locked. Only unmatched selections result in new database records. Matching is case-insensitive.

---

## User Stories & Acceptance Scenarios

### User Story 1 -- First Launch Triggers Wizard (Priority: P1)

As a new user, when I open the app for the first time, I want to be guided through setup so that I understand what the app does and have the basics configured.

**Independent Test**: Open the app with a fresh database. Verify the wizard appears automatically.

**Acceptance Scenarios**:

1. **Given** a fresh database with no `scheduler_settings` row, **When** the app loads, **Then** the onboarding wizard appears as a full-page overlay.
2. **Given** the wizard is visible, **When** I click "Skip Setup", **Then** the wizard closes, the onboarding flag is set to `true`, and I land on the Today page with no roles or activity types seeded.
3. **Given** I have completed the wizard previously (`hasCompletedOnboarding = true`), **When** I open the app, **Then** the wizard does not appear.

---

### User Story 2 -- Step 1: Role Selection (Priority: P1)

As a new user, I want to understand what "roles" are and pick the life areas I want to track.

**Independent Test**: On wizard step 1, verify the Covey defaults are shown with descriptions. Select 3 of 6 roles, proceed to step 2, and verify only the selected 3 were created in the database.

**Acceptance Scenarios**:

1. **Given** I am on step 1, **When** I view the screen, **Then** I see a heading explaining roles (e.g., "Roles represent the different areas of your life -- like Athlete, Professional, or Partner. Pick the ones that matter to you.").
2. **Given** I see the 6 default Covey roles, **When** I view each one, **Then** I see the role name, a brief description, and a toggle/checkbox to include it.
3. **Given** all 6 roles are pre-selected by default, **When** I uncheck "Friend" and "Individual", **Then** only 4 roles are selected.
4. **Given** I have selected my roles, **When** I click "Next", **Then** the selected roles are created in the database with their default scheduling constraints and sequential `displayOrder` values.
5. **Given** I click "Back" from step 2, **When** I return to step 1, **Then** roles already created in the database are shown as locked (disabled toggle, "already created" indicator). New selections are preserved in local state.
6. **Given** roles already exist in the database (from a previous partial run or re-run), **When** I view step 1, **Then** matching roles are shown as pre-selected and locked. I can only toggle roles that don't yet exist.

---

### User Story 3 -- Step 2: Activity Types (Priority: P1)

As a new user, I want to see the default activity types and understand that I can customize them later.

**Independent Test**: On wizard step 2, verify default activity types are shown. Uncheck two, proceed, and verify only the checked ones were created.

**Acceptance Scenarios**:

1. **Given** I am on step 2, **When** I view the screen, **Then** I see a heading explaining activity types (e.g., "Activity types define what you do -- running, tennis, reading, meditation. We've set up some defaults. You can add, edit, or remove them anytime in Settings.").
2. **Given** I see the default activity types (Running, Hiking, Tennis, Climbing Gym, Climbing Outdoor, Reading, Meditation, Journaling, Social Event), **When** I view each one, **Then** I see the icon and name with a checkbox.
3. **Given** all defaults are pre-selected, **When** I uncheck "Hiking" and "Climbing (Outdoor)", **Then** only 7 are selected.
4. **Given** I click "Next", **Then** the selected activity types are created in the database with their full default configurations.
5. **Given** I view the step, **Then** I see a note: "You can configure these anytime in Settings → Activity Types."
6. **Given** activity types already exist in the database (from a previous partial run or re-run), **When** I view step 2, **Then** matching activity types are shown as pre-selected and locked. I can only toggle types that don't yet exist.

---

### User Story 4 -- Step 3: Working Hours (Priority: P1)

As a new user, I want to set my work schedule so the app knows when to plan personal activities vs work activities.

**Independent Test**: On wizard step 3, change work hours to 08:00-16:00 and uncheck Friday. Proceed and verify scheduler settings are saved.

**Acceptance Scenarios**:

1. **Given** I am on step 3, **When** I view the screen, **Then** I see a heading explaining working hours (e.g., "Tell us when you work so we can schedule personal activities around your job. Work-tagged activities go during work hours; everything else goes outside.").
2. **Given** I see the work hours form, **When** I view the defaults, **Then** work start is 09:00, work end is 17:00, and Monday-Friday are checked.
3. **Given** I change work start to 08:00 and uncheck Friday, **When** I click "Next", **Then** the scheduler settings are saved with `workStartTime = "08:00"`, `workDays = [1,2,3,4]`.
4. **Given** I don't change anything, **When** I click "Next", **Then** the defaults are saved as-is.

---

### User Story 5 -- Step 4: Feature Overview (Priority: P1)

As a new user, I want a summary of what the app can do so I know where to go next.

**Independent Test**: On wizard step 4, verify all features are mentioned. Click "Get Started" and verify the wizard closes and the Today page is shown.

**Acceptance Scenarios**:

1. **Given** I am on step 4, **When** I view the screen, **Then** I see a summary with four sections:
   - **Roles** are aspects of your life you want to track (Athlete, Professional, Partner...).
   - **Goals** help you set targets for each role -- yearly objectives broken into monthly benchmarks.
   - **Activities** are the things you do toward your goals. The scheduler helps plan them into your calendar.
   - **Budget** helps you track income, expenses, and savings goals.
2. **Given** I view the summary, **When** I see the "Get Started" button, **Then** clicking it sets `hasCompletedOnboarding = true`, closes the wizard, and shows the Today page.
3. **Given** I view the summary, **When** I see a "What to do next" prompt, **Then** it suggests: "Head to Goals to set your first yearly objective."

---

### User Story 6 -- Re-run Wizard from Settings (Priority: P2)

As a user, I want to re-run the onboarding wizard from Settings if I want to reconfigure my defaults.

**Independent Test**: Go to Settings, click "Run Setup Wizard", verify the wizard appears. Complete it and verify settings are updated.

**Acceptance Scenarios**:

1. **Given** I am on the Settings page, **When** I view the page, **Then** I see a "Run Setup Wizard" button.
2. **Given** I click "Run Setup Wizard", **When** the wizard opens, **Then** it shows existing roles and activity types as pre-selected (not duplicated).
3. **Given** I complete the wizard again, **When** I finish, **Then** any newly selected roles/activity types are added, and existing ones are untouched.

---

## Edge Cases

- **What if the database already has roles (e.g., from a previous partial setup)?** The wizard fetches existing records by name, shows them as pre-selected and locked (disabled toggle). No duplicates are created.
- **What if the user refreshes mid-wizard?** The wizard restarts from step 1. Any roles/activity types already created in previous steps persist in the database and show as locked/selected.
- **What if the user skips the wizard and later visits Settings → Roles?** They can manually add roles from there. The existing "Seed Default Roles" button still works.
- **What if the user clicks "Back" from step 1?** There is no Back button on step 1 (it's the first step).
- **What if the user has a very narrow screen?** The wizard is designed for desktop (per constitution: desktop only). It should work at 1024px minimum width.
- **What if the user un-selects a role/activity type that already exists in the DB?** They can't -- already-created records have disabled toggles. The wizard only adds, never deletes.
- **What if `getOrCreateSettings()` auto-creates the scheduler_settings row before the wizard runs?** The auto-created row has `hasCompletedOnboarding = false` (column default 0), so the wizard still triggers. Step 3 PATCHes the existing row.

---

## Functional Requirements

### Wizard Flow

- **FR-001**: System MUST show the onboarding wizard on first app launch when `hasCompletedOnboarding` is `false` or the `scheduler_settings` row does not exist.
- **FR-002**: Wizard MUST have 4 sequential steps: Role Selection, Activity Types, Working Hours, Feature Overview.
- **FR-003**: Each step MUST have "Next" and "Back" navigation (except step 1 which has no Back, and step 4 which has "Get Started" instead of Next).
- **FR-004**: Wizard MUST have a "Skip Setup" button visible on every step that closes the wizard and sets the onboarding flag.
- **FR-005**: Wizard MUST render as a full-page overlay on top of the app content.

### Step 1: Roles

- **FR-006**: Step 1 MUST display the 6 default Covey roles (Professional, Athlete, Partner, Learner, Friend, Individual) with name, description, and toggle.
- **FR-007**: All roles MUST be pre-selected by default.
- **FR-008**: Clicking "Next" MUST create only the selected roles in the database with their default scheduling constraints (isWorkRole, maxWeeklyOccurrences, minRestDays) and sequential `displayOrder` values (0, 1, 2, ...).
- **FR-009**: If roles already exist in the database (matched by name, case-insensitive), they MUST be shown as pre-selected with a disabled/locked toggle. The wizard MUST NOT delete or modify existing roles.

### Step 2: Activity Types

- **FR-010**: Step 2 MUST display the default activity types (Running, Hiking, Tennis, Climbing Gym, Climbing Outdoor, Reading, Meditation, Journaling, Social Event) with icon and name.
- **FR-011**: All activity types MUST be pre-selected by default.
- **FR-012**: Clicking "Next" MUST create only the selected activity types in the database with their full default configurations (metrics, variants, grade systems).
- **FR-013**: If activity types already exist in the database (matched by name, case-insensitive), they MUST be shown as pre-selected with a disabled/locked toggle. The wizard MUST NOT delete or modify existing activity types.
- **FR-014**: Step 2 MUST include a note directing users to Settings → Activity Types for customization.

### Step 3: Working Hours

- **FR-015**: Step 3 MUST display work start time, work end time, and work days (checkboxes for Mon-Sun).
- **FR-016**: Defaults MUST be 09:00-17:00, Monday-Friday.
- **FR-017**: Clicking "Next" MUST save the scheduler settings by PATCHing the existing singleton row (which may have been auto-created by the `getOrCreateSettings()` helper).

### Step 4: Overview

- **FR-018**: Step 4 MUST explain all four feature areas: Roles, Goals, Activities, Budget.
- **FR-019**: Step 4 MUST include a "What to do next" suggestion directing to Goals.
- **FR-020**: Clicking "Get Started" MUST set `hasCompletedOnboarding = true` and close the wizard.

### Re-run

- **FR-021**: The `/settings` page MUST be replaced with an actual settings landing page that includes a "Run Setup Wizard" card/button, plus navigation links to sub-sections (Roles, Activity Types, Scheduler).
- **FR-022**: Re-running the wizard MUST NOT duplicate existing roles or activity types. Deduplication is done client-side by fetching existing records and matching by name (case-insensitive) before rendering each step.

---

## Schema Changes

### Modify `scheduler_settings` table (additive)

```sql
ALTER TABLE scheduler_settings ADD COLUMN has_completed_onboarding INTEGER NOT NULL DEFAULT 0;
```

One new column. No data loss. Existing rows default to `0` (wizard will show).

---

## API Changes

### Modified endpoints

- `GET /api/scheduler-settings` -- response now includes `hasCompletedOnboarding: boolean`.
- `PATCH /api/scheduler-settings` -- accepts `hasCompletedOnboarding` in request body.

### New endpoints

None. The wizard uses existing endpoints:
- `POST /api/roles` (create roles)
- `GET /api/roles` (check existing)
- `POST /api/activity-types` (create activity types)
- `GET /api/activity-types` (check existing)
- `GET/PATCH /api/scheduler-settings` (read/save work hours and onboarding flag)

---

## UI Components

### New components

- `src/components/onboarding/onboarding-wizard.tsx` -- Main wizard shell with step state, navigation, and overlay.
- `src/components/onboarding/onboarding-gate.tsx` -- Client-side wrapper for `layout.tsx`. Fetches `hasCompletedOnboarding` on mount and conditionally renders the wizard overlay. Accepts `{children}` as a pass-through when onboarding is complete.
- `src/components/onboarding/step-roles.tsx` -- Role selection step. Fetches existing roles on mount, locks matches.
- `src/components/onboarding/step-activity-types.tsx` -- Activity type selection step. Fetches existing types on mount, locks matches.
- `src/components/onboarding/step-working-hours.tsx` -- Work schedule configuration step.
- `src/components/onboarding/step-overview.tsx` -- Feature summary and "Get Started" step.

### Modified components

- `src/app/layout.tsx` -- Wrap `{children}` with `<OnboardingGate>` (the server layout itself remains a server component; `OnboardingGate` is a client component).
- `src/app/settings/page.tsx` -- Replace the redirect with an actual settings landing page containing a "Run Setup Wizard" card/button and links to sub-sections (Roles, Activity Types, Scheduler).

---

## Success Criteria

- **SC-001**: A new user with a fresh database sees the wizard on first load and can complete all 4 steps in under 2 minutes.
- **SC-002**: After completing the wizard, the user has roles, activity types, and scheduler settings configured -- ready to create their first goal.
- **SC-003**: The wizard does not appear on subsequent visits.
- **SC-004**: Skipping the wizard leaves the database clean (no partial data seeded).
- **SC-005**: Re-running the wizard from Settings does not create duplicate roles or activity types.

---

## Implementation Notes

### Data sources for defaults

The wizard reuses the exact same default data already defined in the codebase:

- **Roles**: `DEFAULT_ROLES` array in `src/components/roles/role-list.tsx` (6 roles with name, description, color, isWorkRole, maxWeeklyOccurrences, minRestDays). These should be extracted to a shared constant (e.g., `src/lib/defaults.ts`) so both the wizard and the role-list can reference them.
- **Activity Types**: `DEFAULT_ACTIVITY_TYPES` array in `src/components/activities/sports-page.tsx` (9 types with full metrics, variants, grade systems). Same extraction treatment.

### Deduplication strategy

Each step fetches existing records on mount:
1. `GET /api/roles` → extract names → compare against defaults (case-insensitive)
2. `GET /api/activity-types` → extract names → compare against defaults (case-insensitive)

Matches are rendered with a disabled checkbox and a subtle visual indicator (e.g., muted text, lock icon, or "✓ already created" label). Only non-matching, selected items are POSTed on "Next".

### Layout integration

`layout.tsx` remains a server component. The wizard is integrated via a client-side `<OnboardingGate>` wrapper:

```
layout.tsx (server)
  └─ <OnboardingGate>       ← client component, fetches onboarding status
       ├─ <OnboardingWizard> ← shown when hasCompletedOnboarding === false
       └─ {children}         ← shown when hasCompletedOnboarding === true
```

`OnboardingGate` calls `GET /api/scheduler-settings` on mount. While loading, it can show a minimal splash/skeleton to avoid a flash of the app behind the wizard.

---

## Task Breakdown

| # | Task | Files | Est. |
|---|------|-------|------|
| 1 | **Schema: add `hasCompletedOnboarding` column** | `src/db/schema.ts` | 5 min |
| 2 | **API: update scheduler-settings GET/PATCH** to include `hasCompletedOnboarding` | `src/app/api/scheduler-settings/route.ts`, `src/types/index.ts` | 10 min |
| 3 | **Extract default constants** to shared `src/lib/defaults.ts` | `src/lib/defaults.ts` (new), `src/components/roles/role-list.tsx`, `src/components/activities/sports-page.tsx` | 15 min |
| 4 | **Build OnboardingGate wrapper** | `src/components/onboarding/onboarding-gate.tsx` (new) | 15 min |
| 5 | **Build OnboardingWizard shell** with step navigation, overlay, Skip button | `src/components/onboarding/onboarding-wizard.tsx` (new) | 30 min |
| 6 | **Build Step 1: Role Selection** with locked/unlocked toggles, dedup | `src/components/onboarding/step-roles.tsx` (new) | 30 min |
| 7 | **Build Step 2: Activity Types** with locked/unlocked toggles, dedup | `src/components/onboarding/step-activity-types.tsx` (new) | 25 min |
| 8 | **Build Step 3: Working Hours** with time pickers and day checkboxes | `src/components/onboarding/step-working-hours.tsx` (new) | 20 min |
| 9 | **Build Step 4: Feature Overview** with summary cards and "Get Started" | `src/components/onboarding/step-overview.tsx` (new) | 15 min |
| 10 | **Integrate OnboardingGate into layout.tsx** | `src/app/layout.tsx` | 5 min |
| 11 | **Replace Settings page** with landing page + "Run Setup Wizard" button | `src/app/settings/page.tsx` | 20 min |
| 12 | **Visual polish** -- animations, transitions, responsive layout, consistent styling | All onboarding components | 20 min |
| 13 | **Test & deploy** | Docker build and manual walkthrough | 15 min |

**Total estimated**: ~3.5 hours

### Task dependencies

```
1 → 2 → 3 → 4 → 5 → 6,7,8,9 (parallel) → 10 → 11 → 12 → 13
```

Tasks 6-9 (individual steps) can be built in parallel once the wizard shell (task 5) is done.

---

## Review & Acceptance Checklist

- [x] All P1 user stories have independently testable acceptance scenarios
- [x] P2 user stories have independently testable acceptance scenarios
- [x] Schema changes are additive (no data loss)
- [x] Functional requirements are technology-agnostic
- [x] Edge cases are documented
- [x] Backward compatibility is maintained (existing users see wizard once, then never again)
- [x] Spec aligns with Constitution: visual feedback, simplicity, modular design, local-first
- [x] No scope creep -- no AI features, no auth, no mobile
- [x] Deselection/deduplication behavior is explicitly documented
- [x] Layout integration approach is specified (OnboardingGate wrapper)
- [x] Settings page modification is specified (replace redirect with landing page)
- [x] Role displayOrder seeding is specified
- [x] Task breakdown with estimates and dependencies included
