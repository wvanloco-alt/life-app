# Life App Constitution

## Core Principles

### I. Effectiveness Over Busyness

The app exists to help the user become more *effective*, not more *busy*. It follows Stephen Covey's "fourth generation" time management philosophy: managing yourself, not your time. Features should encourage Quadrant II activity (important but not urgent) and discourage reactive living. The app never rewards volume of activity -- it rewards alignment between actions and deeply held values.

### II. Private-First, Invite-Only Multi-User

~~Originally: Single-User, Local-First.~~

**Amended 2026-03-21** (user approved): The app now supports a small, closed group of invited users (friends of the developer). There is no public registration. The developer acts as admin and creates all accounts manually.

This means:
- Each user has a private login (username + password)
- All data is fully isolated per user — no user can see another's data
- No public sign-up — accounts are created by the admin only
- The app is hosted on a private server accessible via URL
- Data portability is preserved: each user owns their own data
- Privacy by architecture: isolation is enforced at the database query level, not just by policy

**What does not change**:
- No third-party OAuth or social login (keep it simple)
- No public-facing marketing or open access
- SQLite remains the database (suitable for a small friend group)
- The spirit of the app — personal, intentional, private — is unchanged

### III. AI as Advisor, Never as Authority

The AI agent within the app should *suggest* and *assist*, never *decide*. The user remains in full control of their goals, priorities, and schedule. Specifically:
- AI can propose actions, books, or adjustments -- the user accepts or rejects
- AI should explain its reasoning, not just its conclusions
- AI learns from user-provided material (writings, self-evaluations) but does not make assumptions
- Notifications from the AI are suggestions, not demands

### IV. Visual Feedback Over Text

The app communicates through visual cues first, text second. Graphs, color-coded metrics, the human body visualization, and progress indicators are primary interfaces -- not walls of text. This means:
- Dashboards use charts, colors, and shapes to convey status at a glance
- Trend data is shown visually (line charts, bar charts, progress rings)
- The body visualization is a first-class feature, not an afterthought
- Streak tracking and goal progress use visual indicators (not just numbers)

### V. Simplicity and Learnability

This is a learning project. The codebase should be understandable by a beginner studying it. This means:
- Favor straightforward patterns over clever abstractions
- Use well-documented, widely-adopted libraries
- Code comments explain *why*, not *what*
- Each feature should be as self-contained as possible
- Avoid premature optimization -- correctness and clarity first

### VI. Modular Feature Design

Each feature area (Calendar, Budget, Fitness, Dashboard, AI Agent) is a distinct module with clear boundaries. Features can share data but should not be tightly coupled. This means:
- A feature can be built, tested, and used independently
- Shared data flows through well-defined interfaces (not hidden dependencies)
- Adding or removing a feature should not break other features
- The roadmap can be executed in any order if priorities change

## Constraints

### Technology Constraints
- The app runs locally on Windows (the developer's primary OS)
- No external services required for core functionality (AI features may use API calls)
- The tech stack should be chosen for learning value and community support, not for novelty
- Dependencies should be actively maintained and well-documented

### Scope Constraints
- ~~No multi-user support~~ → **Amended 2026-03-21**: Invite-only multi-user is now supported (see Principle II)
- ~~No deployment to production servers~~ → **Amended 2026-03-21**: App is deployed to a private hosted server
- No mobile app (desktop/browser only)
- No public registration or self-service account creation
- External integrations (Strava, etc.) are always optional enhancements, never core requirements

## Development Workflow

### Spec-Driven Process
Every feature follows the spec-kit workflow:
1. **Specify** -- Define what the feature does and why (user stories, acceptance criteria)
2. **Clarify** -- Identify and resolve ambiguities before planning
3. **Plan** -- Choose the technical approach and architecture
4. **Tasks** -- Break the plan into ordered, actionable steps
5. **Implement** -- Build according to the plan, validating against the spec

### Quality Standards
- Each feature must have clear acceptance scenarios that can be manually verified
- Code should be formatted consistently (enforced by tooling)
- The AI assistant explains every decision and waits for user approval before proceeding

## Governance

This constitution is the highest-authority document in the project. All specs, plans, and implementations must align with these principles. If a conflict arises between a feature request and a principle, the principle wins unless the constitution is formally amended.

Amendments require:
1. A clear rationale for why the principle should change
2. User approval
3. Documentation of the change with date

**Version**: 1.1.0 | **Ratified**: 2026-02-27 | **Last Amended**: 2026-03-21

### Amendment Log

| Version | Date | Change | Approved By |
|---------|------|--------|-------------|
| 1.0.0 | 2026-02-27 | Initial constitution ratified | User |
| 1.1.0 | 2026-03-21 | Principle II amended: single-user → invite-only multi-user. Scope constraints updated to allow hosting and multi-user. | User |
