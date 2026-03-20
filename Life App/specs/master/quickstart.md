# Quickstart: Life App - Calendar Management

## Prerequisites

You need these tools installed (all confirmed present on your machine):

| Tool | Version | Check command |
|------|---------|---------------|
| Node.js | 22.x | `node --version` |
| Git | 2.51+ | `git --version` |
| npm | (bundled with Node.js) | `npm --version` |

## Setup (one-time)

### 1. Create the Next.js project

```powershell
cd "c:\Users\wvanloc\Documents\Cursor\PN\Life App"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

This creates the project scaffolding. When prompted:
- Would you like to use TypeScript? **Yes**
- Would you like to use ESLint? **Yes**
- Would you like to use Tailwind CSS? **Yes**
- Would you like to use the `src/` directory? **Yes**
- Would you like to use App Router? **Yes**
- Would you like to customize the default import alias? **No** (accept `@/*`)

### 2. Install additional dependencies

```powershell
npm install drizzle-orm better-sqlite3 recharts date-fns
npm install -D drizzle-kit @types/better-sqlite3 vitest @testing-library/react @testing-library/jest-dom
```

### 3. Install shadcn/ui

```powershell
npx shadcn@latest init
```

When prompted:
- Style: **New York**
- Base color: **Slate**
- CSS variables: **Yes**

Then add the components we need:

```powershell
npx shadcn@latest add button card dialog form input label select sheet sidebar tabs textarea badge calendar separator tooltip dropdown-menu
```

### 4. Initialize the database

```powershell
npx drizzle-kit push
```

This creates the SQLite database file and applies the schema.

## Running the App

```powershell
cd "c:\Users\wvanloc\Documents\Cursor\PN\Life App"
npm run dev
```

Open your browser to **http://localhost:3000**.

## Key Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start the app locally (hot-reload on file changes) |
| `npm run build` | Build for production (not needed for local use, but tests the build) |
| `npx drizzle-kit push` | Apply database schema changes |
| `npx drizzle-kit studio` | Open a visual database browser (useful for debugging) |
| `npm run test` | Run tests |

## Project Files to Know

| File/Folder | What it is |
|-------------|-----------|
| `src/app/` | The pages of the app. Each folder = one URL route. |
| `src/components/` | Reusable UI pieces (buttons, cards, forms, charts). |
| `src/db/schema.ts` | The database structure. Change this to change what data is stored. |
| `src/db/index.ts` | The database connection. You rarely touch this. |
| `package.json` | Lists all dependencies and scripts. Like a recipe card for the project. |
| `tailwind.config.ts` | Styling configuration. Controls colors, fonts, spacing. |
| `life-app.db` | The SQLite database file (created after first run). Your actual data lives here. |
| `backups/` | Auto-backup folder. Daily copies of life-app.db. |

## Troubleshooting

**"Module not found" errors**: Run `npm install` to make sure all dependencies are installed.

**Database errors after changing schema.ts**: Run `npx drizzle-kit push` to sync the database.

**Port 3000 already in use**: Another app is using that port. Either close it or run `npm run dev -- -p 3001` to use port 3001.

**Nothing shows in the browser**: Make sure you're visiting `http://localhost:3000` (not `https://`).
