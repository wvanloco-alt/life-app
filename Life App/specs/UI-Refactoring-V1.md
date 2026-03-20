# UI Refactoring V1

**Status**: Superseded by UI Design Overhaul (2026-03-20)
**Purpose**: Shift the app's visual identity from a "B2B analytics dashboard" to a calm, premium, personal life-management oasis, while retaining all existing functionality.

> **Note**: The concepts in this spec have been implemented and expanded upon by the **UI Design Overhaul** (see `ROADMAP.md`). Typography was upgraded to Plus Jakarta Sans / Fraunces / JetBrains Mono. Color palette shifted to warm amber oklch neutrals. Sidebar icons replaced with Lucide. Motion system added. Goal cards, activity graphs, and scheduler settings were redesigned. This document is retained for historical reference.

## Core Philosophy
The app is grounded in *The 7 Habits of Highly Effective People*. Its interface should reflect intentionality, peace, and focus—not busyness. We will introduce more whitespace, standardize our visual language, guide the user through empty states, and elevate the daily experience.

---

## The 7 Phases of Refactoring

### Phase 1: Navigation Overload (Sidebar Cleanup)
**The Problem**: The sidebar mixes daily features (Today, Monthly Plan, Budget) with foundational setup (Roles, Activity Types, Mission), creating cognitive clutter.
**The Solution**: Group the navigation into logical sections and move configuration out of the main flow.
- **Action 1**: Update `app-sidebar.tsx`. Create visual groups using `SidebarGroup` (e.g., "Daily Focus", "Life Areas", "Foundation").
- **Action 2**: Create a new `/settings` area with sub-routes: `/settings/roles` and `/settings/activity-types`. Each keeps its own full page (Roles has drag-to-reorder, Activity Types has metric config builders and variant builders -- these are too complex for tabs).
- **Action 3**: Remove "Roles" and "Activity Types" from the primary sidebar. Add a gear icon link to `/settings` in the sidebar footer (or as the last item in a "Settings" group). Keep "Mission" in the sidebar under "Foundation" as it's meant to be reviewed frequently.
- **Sidebar groups** (explicit mapping):
  - **Daily Focus**: Today, Monthly Plan
  - **Life Areas**: Activities, Budget, Goals
  - **Foundation**: Mission, Analytics
  - **Settings** (footer gear icon): `/settings` (with sub-nav to Roles, Activity Types)

### Phase 2: Beautiful Empty States (The "Cold Start" Problem)
**The Problem**: When a user hasn't logged data, cards show plain text like *"No activities yet"*. It feels dead and uninviting.
**The Solution**: Implement a unified empty state component across the app.
- **Action 1**: Create a reusable `<EmptyState />` component in `src/components/ui/empty-state.tsx`. It should include a soft, faded icon, a friendly headline, a subtle description, and an optional Call-to-Action button.
- **Action 2**: Apply `<EmptyState />` to:
  - Budget Dashboard (when no spending is recorded)
  - Activities Dashboard (when no recent workouts or volume exist)
  - Daily View (when no activities are scheduled)
  - Goals page (when no goals exist yet -- the true cold start)
  - Monthly Plan (when no schedule has been generated for the month)

### Phase 3: Information Density (Breathing Room)
**The Problem**: Dashboards are very data-dense. Multiple grids, charts, and lists are stacked tightly, making the app feel overwhelming.
**The Solution**: Introduce whitespace and softer visual grouping.
**Scope**: Limited to three pages -- Monthly Plan, Budget, and Activities.
- **Action 1**: Increase padding inside primary cards (e.g., change `p-6` to `p-8` for major sections) on the Budget Dashboard, Activities Dashboard, and Monthly Plan grid.
- **Action 2**: Soften borders. Reduce the use of heavy borders on cards, relying more on subtle background colors (like `bg-muted/30`) to group related information.
- **Action 3**: Simplify typography. Reduce the prominence of secondary text (use smaller, lighter gray fonts for labels) to make the primary data stand out without shouting.
- **Done when**: Each of the three pages (Monthly Plan, Budget, Activities) has been visually verified by the user.

### Phase 4: Dark Mode Foundation & Theme Toggle
**The Problem**: The app does not currently support dark mode, but modern premium apps expect first-class light/dark theme support.
**The Solution**: Implement `next-themes` and ensure shadcn's variables map correctly.
- **Action 1**: Install `next-themes` and wrap the app in a `<ThemeProvider>`.
- **Action 2**: Add a Theme Toggle button to the layout (perhaps in the top right or bottom of the sidebar).
- **Action 3**: Audit `globals.css` to ensure all standard shadcn CSS variables are correctly defined for `.dark`.

### Phase 5: Visual Consistency (Icons & Colors)
**The Problem**: The app mixes Lucide icons with Emojis, and uses a mix of Tailwind utility colors and hardcoded hex codes, which clash without proper dark mode support.
**The Solution**: Standardize the visual language.
- **Action 1**: For categories that use Emojis (like Budget categories or Activity Types), wrap the emoji in a consistent, soft-colored rounded square (`size-8 rounded-md bg-muted flex items-center justify-center`). This makes them feel like intentional UI elements rather than raw text.
- **Action 2**: Audit hardcoded hex colors (e.g., `#EF4444`). Convert them to semantic CSS variables or use a utility function to adjust luminosity/contrast automatically depending on the active theme (from Phase 4).

### Phase 6: Today View Refinement
**The Problem**: The Today page is the landing page and most-used screen, but lacks clear visual hierarchy between scheduled activities, completed activities, and logged activities.
**The Solution**: Elevate the daily experience with a dedicated visual pass.
- **Action 1**: Move the "Day Summary" (progress/hours) to the top of the page as a clean, horizontal banner or elegant widget, acting as a daily health check rather than burying it in the right column.
- **Action 2**: Improve the distinction between "To Do" (scheduled) and "Done" (completed/logged). Completed items should visually recede (softer opacity, greyer text) so the active tasks pop.
- **Action 3**: Streamline the "Log Activity" vs "Add" workflow so the primary actions are obvious and frictionless.
- **Action 4**: Integrate the Empty States (from Phase 2) specifically tailored to motivate starting the day.

### Phase 7: Monthly Plan Calendar Polish
**The Problem**: The Monthly Plan grid (`weekly-plan-view.tsx` and `day-column.tsx`) renders a compact month calendar. The cells feel rigid and boxy, and activity blocks lack visual refinement.
**The Solution**: Refine the month calendar UI to feel like a modern, premium planner (inspired by Cron/Notion Calendar).
- **Action 1**: Improve typography hierarchy in the month grid cells (e.g., subtle gray for the day name, bolder for the date number, softer treatment for weekend days).
- **Action 2**: Soften the grid borders (use `border-border/50` or similar) and add gentle hover states to day cells.
- **Action 3**: Enhance the activity block visual design within day cells (softer pill-shapes, clearer visual distinction between "completed", "todo", and "carry forward" statuses via color/opacity).

---

## Execution Plan
Following the "Shape Up" and "Vibe Coder" principles, we will execute these phases sequentially in small, verifiable chunks. 

1. **Phase 1** (Nav/Settings)
2. **Phase 2** (Empty States)
3. **Phase 3** (Breathing Room)
4. **Phase 4 & 5** (Dark Mode Foundation & Visual Consistency)
5. **Phase 6** (Today View Refinement)
6. **Phase 7** (Calendar Polish)