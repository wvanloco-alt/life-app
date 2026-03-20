# Research: Calendar Management (7 Habits)

## Technology Decisions

### 1. Application Framework: Next.js 15 (App Router)

**Decision**: Use Next.js 15 with the App Router and TypeScript.

**Rationale**: Next.js provides a full-stack framework in a single project. The App Router (introduced in Next.js 13, stable in 14+) uses React Server Components which simplify data loading. For a local-only app, Next.js runs as a dev server via `npm run dev` -- no deployment needed. TypeScript adds type safety, which catches errors before runtime and improves the learning experience with better editor autocomplete.

**Alternatives considered**:
- **Vite + React**: Lighter, but requires separate API/backend setup for database access. More configuration.
- **Remix**: Excellent framework, but smaller community and fewer learning resources.
- **SvelteKit**: Smaller ecosystem. Fewer component libraries. Harder to find help.
- **Electron**: Desktop app wrapper. Adds significant complexity (packaging, updates, IPC). Overkill for a local dev server.

### 2. UI Component Library: shadcn/ui

**Decision**: Use shadcn/ui with Tailwind CSS v4.

**Rationale**: shadcn/ui provides copy-paste React components built on Radix UI primitives (accessible, keyboard-navigable). Unlike traditional component libraries (Material UI, Chakra), shadcn/ui copies components into your project so you own and can modify them. This is better for learning -- you can read and understand the component code. The components are styled with Tailwind CSS, which uses utility classes directly in HTML rather than separate CSS files.

**Alternatives considered**:
- **Material UI (MUI)**: Heavy dependency, opinionated design language, harder to customize.
- **Chakra UI**: Good, but less popular than shadcn/ui in 2025-2026, fewer examples.
- **Ant Design**: Enterprise-focused, complex API, heavy bundle size.
- **Hand-built CSS**: Not practical for a beginner. Would take 10x longer and look worse.

### 3. Database: SQLite via Drizzle ORM

**Decision**: Use SQLite as the database with Drizzle ORM for type-safe database access.

**Rationale**: SQLite stores everything in a single file on disk -- no database server to install or manage. Drizzle ORM provides TypeScript types that match the database schema, so the editor catches errors when you try to save data with wrong field names or types. Drizzle is lightweight (no code generation step like Prisma) and has excellent Next.js integration via `better-sqlite3`.

**Alternatives considered**:
- **Prisma**: More popular, but requires a generation step (`prisma generate`) after every schema change. Heavier runtime. The generation step adds friction for learning.
- **Raw SQL**: No type safety, easy to make mistakes, harder to learn.
- **JSON files**: No query capability, no relationships, manual file management. Would not scale to analytics features.
- **PostgreSQL**: Requires installing and running a separate database server. Overkill for single-user local app.

### 4. Charts & Visualization: Recharts

**Decision**: Use Recharts for all data visualization (pie charts, line charts, bar charts).

**Rationale**: Recharts is the most popular React charting library. Built on D3.js but exposes a simple React component API. Declarative -- you describe what chart you want, not how to draw it. Excellent documentation with examples.

**Alternatives considered**:
- **Chart.js / react-chartjs-2**: Good, but less React-idiomatic. More imperative API.
- **Nivo**: Beautiful defaults but less customizable without deep knowledge.
- **D3.js directly**: Too low-level for a beginner. You'd spend weeks on charts alone.
- **Tremor**: Built on Recharts, adds dashboard components but limits flexibility.

### 5. Date/Time Handling: date-fns

**Decision**: Use date-fns for all date manipulation (week calculations, formatting, comparisons).

**Rationale**: The calendar feature is heavily date-dependent (weeks starting on Monday, daily views, trend analysis over 4/8/12 weeks). JavaScript's built-in Date API is notoriously poor. date-fns provides tree-shakeable utility functions (only import what you use) with consistent, well-documented behavior. It handles ISO weeks, locale formatting, and date arithmetic correctly.

**Alternatives considered**:
- **Day.js**: Lighter but less comprehensive for week-based calculations.
- **Luxon**: Good, but heavier and less commonly used in React projects.
- **Moment.js**: Deprecated. Should not be used in new projects.

### 6. State Management: React Context + Server Components

**Decision**: Use React Context for client-side state and Next.js Server Components for data fetching. No external state management library.

**Rationale**: For a single-user local app, the state management needs are simple: the current week being viewed, the active role filter, UI state like sidebar open/closed. React's built-in Context API handles this without adding another dependency. Server Components handle data loading from SQLite, so most "state" is actually just fresh database queries.

**Alternatives considered**:
- **Zustand**: Good lightweight option, but adds a dependency we don't need yet.
- **Redux**: Too complex for this scope. Would confuse a beginner.
- **Jotai/Recoil**: Atomic state management -- good for complex UIs but overkill here.

### 7. Testing: Vitest + React Testing Library

**Decision**: Use Vitest for unit tests and React Testing Library for component tests.

**Rationale**: Vitest is fast, TypeScript-native, and compatible with the Next.js/Vite ecosystem. React Testing Library tests components the way users interact with them (clicking, typing, reading) rather than testing implementation details. This teaches good testing habits from the start.

**Alternatives considered**:
- **Jest**: Industry standard but slower and requires more configuration with TypeScript.
- **Playwright**: For end-to-end browser testing. We'll add this later, not for Feature 1.
- **Cypress**: Similar to Playwright. Deferred to later features.

### 8. Backup Strategy: File Copy

**Decision**: Auto-backup the SQLite database file daily by copying it to a `backups/` folder with a timestamped filename. Retain the 7 most recent backups.

**Rationale**: Since all data lives in a single SQLite file, backup is simply a file copy. A scheduled function on app startup checks if a backup has been made today; if not, it copies the database file. This is the simplest reliable backup strategy and requires no external tools.

**Alternatives considered**:
- **SQLite `.backup()` API**: More robust for concurrent access, but we have a single user so file copy is sufficient.
- **Git-based versioning**: Interesting but adds complexity and binary files don't diff well in Git.
- **Export to JSON**: Useful for data portability (we may add this later) but slower than file copy for daily backups.
