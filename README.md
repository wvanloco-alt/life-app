Life App
A personal life management app built for one person. It turns long-term goals into daily action across time, health, finances, and personal growth — grounded in the principles of The 7 Habits of Highly Effective People.

This is not a SaaS product. There is no auth, no multi-tenancy, no cloud dependency. It runs locally via Docker with a SQLite database, designed to be self-hosted and fully owned.

What It Does
Calendar & Planning — Define life roles (Athlete, Professional, Partner, etc.), set yearly goals with monthly benchmarks, and use an auto-scheduler to generate a monthly activity plan. The scheduler respects work/personal time windows, rest days, blackout dates, preferred days, and session patterns.

Fitness & Activity Tracking — Log activities across sports (Running, Tennis, Climbing, Hiking) and non-physical pursuits (Reading, Meditation, Journaling). Track body metrics (weight, VO2max, resting HR) with trend visualization. Activities logged from any entry point sync bidirectionally.

Training Periodization — Sport-specific periodization engines for Running, Tennis, and Climbing. Enter your profile, get a level assessment, and generate a phased training plan with rich descriptions covering sport-specific focus, supplemental training, and mental game. Phase-aware scheduling produces context-rich activity titles.

Budget Management — Monthly financial tracker with income, fixed costs, daily spending, savings goals, and planned expenses. Real-time remaining budget, daily allowance, and yearly overview with charts.

Goals Dashboard — Two-level goal hierarchy (yearly → monthly benchmarks) with progress rings, pace tracking, tally logging, and streak visualization.

Tech Stack
Layer	Technology
Framework	Next.js 16 (App Router, Turbopack)
Language	TypeScript 5
Styling	Tailwind CSS v4 (oklch theme)
Components	shadcn/ui
Typography	Plus Jakarta Sans, Fraunces, JetBrains Mono
Database	SQLite via Drizzle ORM + better-sqlite3
Charts	Recharts
Drag & Drop	@dnd-kit/core
Testing	Vitest + React Testing Library
Deployment	Docker (self-hosted)
Getting Started
Prerequisites
Node.js 20+
npm
Install and Run
# Install dependencies
npm install

# Run the development server
npm run dev
Open http://localhost:3000.

Docker
# Build and run
docker compose up --build
The SQLite database is persisted via a Docker volume. Daily auto-backups are stored in /backups.

Database
The app uses SQLite with Drizzle ORM. On first run, default roles, activity types, and spending categories are auto-seeded.

# Generate a migration after schema changes
npx drizzle-kit generate

# Apply migrations
node apply-schema.js
Project Structure
src/
├── app/              # Next.js App Router pages and API routes
│   ├── activities/   # Activity logging and dashboard
│   ├── budget/       # Budget management
│   ├── daily/        # Day view
│   ├── goals/        # Goals dashboard and management
│   ├── monthly-plan/ # Monthly calendar with drag-and-drop
│   ├── settings/     # Roles, activity types, scheduler config
│   ├── today/        # Today view (home page)
│   └── api/          # REST API endpoints
├── components/       # Reusable UI components
├── db/               # Drizzle schema and database connection
├── hooks/            # Custom React hooks
├── lib/              # Utilities, defaults, training engines
├── test/             # Vitest test suites
└── types/            # TypeScript interfaces
specs/                # Feature specifications
migrations/           # Drizzle SQL migrations
Development
# Run tests
npm test

# Run tests once (CI)
npm run test:run

# Lint
npm run lint

# Build for production
npm run build
Documentation
ROADMAP.md — Feature roadmap with status and architectural history
AGENT-ONBOARDING.md — Onboarding document for AI agents working on this codebase
.cursor/rules/ — Cursor IDE rules for agent behavior and development workflow
specs/ — Feature specifications and data model documentation
