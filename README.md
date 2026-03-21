# Life App

A personal life management app that turns long-term goals into daily action across time, health, finances, and personal growth — grounded in the principles of *The 7 Habits of Highly Effective People*.

Built as a private, invite-only tool for a small group of friends. Each user has their own account and fully isolated data. Self-hosted via Docker with a SQLite database.

---

## What It Does

### Calendar & Planning
Define life roles (Athlete, Professional, Partner, etc.), set yearly goals with monthly benchmarks, and use an auto-scheduler to generate a monthly activity plan. The scheduler respects work/personal time windows, rest days, blackout dates, preferred days, and session patterns.

### Fitness & Activity Tracking
Log activities across sports (Running, Tennis, Climbing, Hiking) and non-physical pursuits (Reading, Meditation, Journaling). Track body metrics (weight, VO2max, resting HR) with trend visualization. Activities logged from any entry point sync bidirectionally.

### Training Periodization
Sport-specific periodization engines for Running, Tennis, and Climbing. Enter your profile, get a level assessment, and generate a phased training plan with rich descriptions covering sport-specific focus, supplemental training, and mental game.

### Budget Management
Monthly financial tracker with income, fixed costs, daily spending, savings goals, and planned expenses. Real-time remaining budget, daily allowance, and yearly overview with charts.

### Goals Dashboard
Two-level goal hierarchy (yearly → monthly benchmarks) with progress rings, pace tracking, tally logging, and streak visualization.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (oklch theme) |
| Components | shadcn/ui |
| Typography | Plus Jakarta Sans, Fraunces, JetBrains Mono |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| Auth | NextAuth.js v5 (credentials provider) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/core |
| Testing | Vitest + React Testing Library |
| Deployment | Docker (self-hosted or Railway) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Run Locally

```bash
# Install dependencies
cd "Life App"
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp "Life App/.env.example" "Life App/.env.local"
```

Required variables:

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Random secret for NextAuth (generate with `openssl rand -base64 32`) |
| `DB_PATH` | Path to SQLite file (e.g. `./life-app.db` locally, `/data/life-app.db` in production) |
| `NEXTAUTH_URL` | Public URL of the app (e.g. `http://localhost:3000`) |

### Create the First Admin User

After setting up your `.env.local`, create the admin account:

```bash
cd "Life App"
npx tsx src/scripts/create-admin.ts
```

Then log in at `/login` with the credentials you set.

### Docker / Railway

The app is deployed on Railway using the `Dockerfile` in `Life App/`. See [`Life App/DEPLOYMENT.md`](./Life%20App/DEPLOYMENT.md) for the full guide.

To build the Docker image locally:

```bash
docker build -t life-app ./Life\ App
```

The SQLite database is persisted via a volume mounted at `/data`. Daily auto-backups are stored in `/data/backups`.

---

## Database

The app uses SQLite with Drizzle ORM.

```bash
# Generate a migration after schema changes
npx drizzle-kit generate

# Apply migrations
node apply-schema.js
```

On first login, each new user gets default roles, activity types, and spending categories automatically seeded.

---

## Project Structure

```
Life App/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── activities/   # Activity logging and dashboard
│   │   ├── budget/       # Budget management
│   │   ├── goals/        # Goals dashboard and management
│   │   ├── monthly-plan/ # Monthly calendar with drag-and-drop
│   │   ├── settings/     # Roles, activity types, scheduler config
│   │   ├── today/        # Today view (home page)
│   │   ├── admin/        # Admin user management
│   │   └── api/          # REST API endpoints
│   ├── components/       # Reusable UI components
│   ├── db/               # Drizzle schema and database connection
│   ├── lib/              # Utilities, defaults, training engines
│   ├── scripts/          # One-time setup scripts (admin creation, migrations)
│   ├── test/             # Vitest test suites
│   └── types/            # TypeScript interfaces
├── specs/                # Feature specifications
└── migrations/           # Drizzle SQL migrations
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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Documentation

- [`Life App/ROADMAP.md`](./Life%20App/ROADMAP.md) — Feature roadmap with status and architectural history
- [`Life App/DEPLOYMENT.md`](./Life%20App/DEPLOYMENT.md) — Deployment guide (Railway, Docker, env vars, troubleshooting)
- [`Life App/AGENT-ONBOARDING.md`](./Life%20App/AGENT-ONBOARDING.md) — Onboarding document for AI agents working on this codebase
- [`Life App/.specify/memory/constitution.md`](./Life%20App/.specify/memory/constitution.md) — Governing principles of the project
- [`Life App/specs/`](./Life%20App/specs/) — Feature specifications and data model documentation
