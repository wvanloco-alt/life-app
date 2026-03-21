# Contributing to Life App

This is a private app shared between a small group. If you're reading this, you're probably a friend who wants to help build it. Welcome — here's how we work.

---

## Ground Rules

- **One feature at a time.** We don't build two things at once.
- **Spec before code.** Every feature starts with a written spec. No spec, no code.
- **Small steps.** Small, focused commits are better than one giant dump.
- **Ask before doing anything big.** If you're unsure, open an issue and discuss first.

---

## Branching

We use a simple branching model:

| Branch | Purpose |
|--------|---------|
| `master` | Always working. What's deployed. Never commit directly. |
| `feature/your-feature-name` | One branch per feature |
| `fix/bug-description` | One branch per bug fix |

### Starting a new feature

```bash
git checkout master
git pull
git checkout -b feature/your-feature-name
```

### Naming conventions

- Features: `feature/friend-release`, `feature/dark-mode`
- Bug fixes: `fix/login-redirect`, `fix/budget-rounding`
- Docs/chores: `chore/update-readme`, `docs/add-api-docs`

---

## Commit Messages

Use this format:

```
feat: add login page with username/password form
fix: redirect to /today after login instead of /
chore: install bcryptjs and @types/bcryptjs
docs: update README with auth setup instructions
refactor: extract session check into reusable helper
test: add unit tests for level assessment logic
```

**Prefixes:**
- `feat` — new feature or behaviour
- `fix` — bug fix
- `chore` — dependency updates, config, tooling
- `docs` — documentation only
- `refactor` — code change with no behaviour change
- `test` — tests only

Keep the message short (under 72 characters). If you need more detail, add a blank line and a paragraph below.

---

## Pull Requests

1. Push your branch to GitHub
2. Open a Pull Request (PR) against `master`
3. Write a short description: what you built and why
4. Request a review from the other person
5. Only merge after approval — no self-merging

### PR description template

```
## What this does
[One sentence summary]

## Why
[Brief context]

## How to test
[Steps to manually verify it works]

## Checklist
- [ ] Tested locally
- [ ] No console errors
- [ ] No .env secrets committed
```

---

## Running the App Locally

```bash
cd "Life App"
npm install
cp .env.example .env.local   # then fill in the values
npx tsx src/scripts/create-admin.ts   # first time only
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Conventions

- **Pages are thin.** `src/app/*/page.tsx` delegates to components in `src/components/`.
- **State is local.** `useState` + `useEffect`. No Redux or Zustand.
- **APIs are REST.** All under `src/app/api/`. Fetch with `Promise.all` for parallel loading.
- **Every API route checks auth.** Read the session, return 401 if missing. Scope all queries by `userId`.
- **Optimistic UI for toggles.** Update local state immediately, then sync with the API.

---

## What Not to Do

- Do not commit `.env`, `.env.local`, or any file containing secrets.
- Do not commit `*.db` files — the database is local only.
- Do not push directly to `master`.
- Do not start building before there's a spec for the feature.
- Do not rewrite existing features when adding new ones — scope is additive.

---

## Getting Up to Speed

Read these in order before touching any code:

1. `Life App/AGENT-ONBOARDING.md` — full project context
2. `Life App/ROADMAP.md` — what's built and what's planned
3. `Life App/.specify/memory/constitution.md` — governing principles
4. `Life App/specs/master/data-model.md` — database tables
