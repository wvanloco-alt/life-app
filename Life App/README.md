# Life App

A personal life management app that turns long-term goals into daily action across time, health, finances, and personal growth — grounded in the principles of *The 7 Habits of Highly Effective People*.

Built as a private, invite-only tool for a small group of friends. Each user has their own account and fully isolated data. Hosted on Railway via Docker with a SQLite database.

---

## What It Does

**Calendar & Planning** — Define life roles (Athlete, Professional, Partner, etc.), set yearly goals with monthly benchmarks, and use an auto-scheduler to generate a monthly activity plan. The scheduler respects work/personal time windows, rest days, blackout dates, preferred days, and session patterns.

**Fitness & Activity Tracking** — Log activities across sports (Running, Tennis, Climbing, Hiking) and non-physical pursuits (Reading, Meditation, Journaling). Track body metrics (weight, VO2max, resting HR) with trend visualization. Activities logged from any entry point sync bidirectionally.

**Training Periodization** — Sport-specific periodization engines for Running, Tennis, and Climbing. Enter your profile, get a level assessment, and generate a phased training plan with rich descriptions covering sport-specific focus, supplemental training, and mental game. Phase-aware scheduling produces context-rich activity titles.

**Budget Management** — Monthly financial tracker with income, fixed costs, daily spending, savings goals, and planned expenses. Real-time remaining budget, daily allowance, and yearly overview with charts.

**Goals Dashboard** — Two-level goal hierarchy (yearly → monthly benchmarks) with progress rings, pace tracking, tally logging, and streak visualization.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (oklch theme) |
| Components | shadcn/ui |
| Typography | Plus Jakarta Sans, Fraunces, JetBrains Mono |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| Auth | NextAuth.js v5 (credentials provider, JWT sessions) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/core |
| Testing | Vitest + React Testing Library |
| Deployment | Docker + Railway |

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 20+
- npm

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will see the login page.

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Local value | Description |
|----------|-------------|-------------|
| `AUTH_SECRET` | Any 32+ char string | Signs JWT session tokens |
| `DB_PATH` | `./life-app.db` | Path to the SQLite database file |
| `NEXTAUTH_URL` | `http://localhost:3000` | Public URL for NextAuth redirects |

### Create the Admin Account

```bash
npx tsx src/scripts/create-admin.ts
```

Then log in at `http://localhost:3000/login` with those credentials.

---

## Database

The app uses SQLite with Drizzle ORM.

```bash
# Generate a migration after schema changes (local dev only)
npx drizzle-kit generate

# Apply schema changes (local and production)
node apply-schema.js
```

`apply-schema.js` is idempotent — it uses `CREATE TABLE IF NOT EXISTS` so it is safe to run on every boot. In production, it runs automatically at container startup.

On first login, each new user gets default roles, activity types, and spending categories automatically seeded.

---

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── activities/   # Activity logging and dashboard
│   ├── admin/        # Admin user management
│   ├── budget/       # Budget management
│   ├── goals/        # Goals dashboard and management
│   ├── login/        # Login page
│   ├── monthly-plan/ # Monthly calendar with drag-and-drop
│   ├── settings/     # Roles, activity types, scheduler config
│   ├── today/        # Today view (home page)
│   └── api/          # REST API endpoints
├── components/       # Reusable UI components
├── db/               # Drizzle schema and database connection
├── lib/              # Utilities, auth, defaults, training engines
├── scripts/          # One-time setup scripts
├── test/             # Vitest test suites
└── types/            # TypeScript interfaces
specs/                # Feature specifications and data model
migrations/           # Drizzle SQL migration files
```

---

## Development Commands

```bash
npm run dev          # Start development server
npm test             # Run tests in watch mode
npm run test:run     # Run tests once (CI)
npm run lint         # Lint
npm run build        # Production build
```

---

## Deployment

The app is deployed on Railway. See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full guide covering:

- Environment variables
- First-deploy steps (Railway setup, volume, env vars)
- How `apply-schema.js` works
- Container security (`su-exec` privilege drop)
- Troubleshooting common errors

**Production URL**: `https://life-app-production-938a.up.railway.app`

---

## Documentation

- `ROADMAP.md` — Feature roadmap with status and architectural history
- `DEPLOYMENT.md` — Deployment guide (Railway, Docker, env vars, troubleshooting)
- `AGENT-ONBOARDING.md` — Onboarding document for AI agents working on this codebase
- `.cursor/rules/` — Cursor IDE rules for agent behavior and development workflow
- `specs/` — Feature specifications and data model documentation
- `.specify/memory/constitution.md` — Governing principles of the project
