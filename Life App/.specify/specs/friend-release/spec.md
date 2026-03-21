# Feature Specification: Friend Release (Multi-User)

**Spec ID**: `friend-release`
**Created**: 2026-03-21
**Completed**: 2026-03-21
**Status**: Complete
**Constitutional basis**: Amendment v1.1.0 (2026-03-21) — Principle II updated to allow invite-only multi-user.

---

## Overview

The app was built for one person. It is now being extended to support a small, closed group of invited friends. Each friend gets their own private account, their own isolated data, and the same full app experience. The developer (you) acts as the admin and manages all accounts.

This is not a SaaS launch. It is a private tool shared with people you trust.

---

## User Scenarios & Testing

### User Story 1 — Login & Session (Priority: P1)

A user visits the app URL, sees a login page, enters their username and password, and is taken to their private dashboard. All their data is only theirs.

**Why this priority**: Nothing else works without auth. This is the foundation.

**Independent Test**: Deploy the app with two users seeded. Log in as each. Confirm each sees only their own data.

**Acceptance Scenarios**:

1. **Given** a user has an account, **When** they visit the app URL, **Then** they see a login page (not the dashboard).
2. **Given** correct credentials, **When** they submit the login form, **Then** they are redirected to `/today` with their session active.
3. **Given** wrong credentials, **When** they submit the form, **Then** they see an error message and stay on the login page.
4. **Given** an active session, **When** they close and reopen the browser, **Then** they remain logged in (persistent session).
5. **Given** an active session, **When** they click "Log out", **Then** their session is cleared and they are returned to the login page.
6. **Given** no active session, **When** they try to access any app route directly, **Then** they are redirected to the login page.

---

### User Story 2 — Per-User Data Isolation (Priority: P1)

Every piece of data in the app belongs to exactly one user. No user can see, modify, or accidentally access another user's goals, activities, budget, or calendar.

**Why this priority**: Without this, auth is cosmetic. Data isolation is the real security guarantee.

**Independent Test**: Create two users with overlapping data (same goal name). Log in as each. Confirm each only sees their own records in every section of the app.

**Acceptance Scenarios**:

1. **Given** two users exist, **When** User A logs goals, **Then** User B cannot see or access those goals.
2. **Given** User A has budget data, **When** User B views the Budget section, **Then** they see their own empty state (not User A's data).
3. **Given** any API route, **When** a request is made without a valid session, **Then** the API returns 401 Unauthorized.
4. **Given** a valid session for User A, **When** User A calls any API endpoint, **Then** the response only contains User A's data.

---

### User Story 3 — Admin: User Account Management (Priority: P2)

The admin (you) can create accounts for friends, set their username and initial password, and deactivate accounts if needed. There is no self-service registration.

**Why this priority**: Without this, you cannot onboard friends. But the app can work with just one or two hardcoded users until this is ready, so it's P2.

**Independent Test**: Log in as admin. Create a new user. Log out. Log in as the new user. Confirm access works.

**Acceptance Scenarios**:

1. **Given** the admin is logged in, **When** they visit `/admin/users`, **Then** they see a list of all users.
2. **Given** the admin creates a new user with username + password, **Then** the user can log in immediately.
3. **Given** the admin deactivates a user, **Then** that user can no longer log in.
4. **Given** a non-admin user, **When** they try to access `/admin/*`, **Then** they receive a 403 Forbidden response.

---

### User Story 4 — First-Time User Experience (Priority: P2)

When a new user logs in for the first time, they see an empty app with appropriate empty states and default data seeded (default activity types, spending categories, and roles). They can start using the app immediately without any setup step.

**Why this priority**: Without defaults, a new user sees an empty broken-looking app. Defaults already exist in `src/lib/defaults.ts` — we just need to seed them per user on first login.

**Acceptance Scenarios**:

1. **Given** a brand new user account, **When** they log in for the first time, **Then** default roles, activity types, and spending categories are seeded for them automatically.
2. **Given** a returning user, **When** they log in, **Then** no re-seeding occurs (idempotent).

---

### User Story 5 — Hosted Deployment (Priority: P3)

The app is accessible via a real URL (not localhost). Friends can open it in any browser on any computer without installing anything.

**Why this priority**: Everything else can be done locally first. Deployment is the last step before friends can actually use it.

**Acceptance Scenarios**:

1. **Given** the app is deployed, **When** a friend visits the URL, **Then** they see the login page over HTTPS.
2. **Given** a friend logs in, **Then** the app loads and functions identically to local development.
3. **Given** the app has been running for 7 days, **Then** no data has been lost (SQLite persistence is working).

---

## Edge Cases

- What if a user's session expires mid-use? → Redirect to login, preserve their current URL so they return to the same page after login.
- What if two users sign up with the same username? → Username must be unique; admin UI shows an error.
- What if the admin accidentally deletes their own account? → Prevent deletion of the last admin account.
- What if a user tries to access another user's data by guessing IDs? → All API queries must be scoped with `WHERE user_id = session.user.id`. ID guessing returns 404 (not 403, to avoid leaking existence).

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST require authentication before displaying any page or data.
- **FR-002**: System MUST store passwords as secure hashes (bcrypt, min 12 rounds). Plain text passwords must never be stored.
- **FR-003**: System MUST scope every database query by the authenticated user's ID.
- **FR-004**: System MUST seed default data (roles, activity types, spending categories, scheduler settings) for each user on first login.
- **FR-005**: System MUST provide an admin-only section for creating and deactivating user accounts.
- **FR-006**: System MUST redirect unauthenticated requests to the login page (not return a blank screen or 500).
- **FR-007**: System MUST run over HTTPS in production.
- **FR-008**: System MUST persist SQLite data across container restarts (Docker volume mount).

### Key Entities

- **User**: username (unique), hashed password, role (admin / user), active flag, created_at. This is a new table not tied to any existing feature data.
- **Session**: managed by NextAuth.js — stored server-side or as a signed JWT. Contains user ID and role.
- **user_id column**: added to every existing data table to link records to their owner.

---

## Technical Approach

### Authentication Library

**NextAuth.js v5** (also called Auth.js) with the Credentials provider.
- Well documented, built for Next.js App Router.
- Credentials provider = username + password, no OAuth needed.
- Session stored as a signed JWT in an HTTP-only cookie.

### Password Storage

- `bcryptjs` — pure JavaScript bcrypt, no native compilation needed on Windows.
- Hash on account creation, compare on login.

### Data Isolation Strategy

- Add `user_id TEXT NOT NULL` to every data table via Drizzle migrations.
- All API routes read `session.user.id` from the NextAuth session and append it to every query.
- Middleware (`src/middleware.ts`) protects all routes except `/login` and `/api/auth/*`.

### Admin Interface

- Simple `/admin/users` page, only accessible when `session.user.role === "admin"`.
- Create user form: username + password.
- Deactivate toggle (soft delete — sets `active = false`).

### Hosting

- **Railway** (recommended): Docker-native, cheap (~$5–10/month), simple environment variable management, persistent volumes.
- Alternatively: Fly.io (similar capability).
- HTTPS is handled automatically by Railway/Fly.io.

---

## Success Criteria

- **SC-001**: A friend can log in, use the full app, and log out — without any help from the developer.
- **SC-002**: Two users' data never appear in each other's views — verified by manual testing with two accounts.
- **SC-003**: The admin can create a new account in under 2 minutes.
- **SC-004**: The app is accessible via HTTPS URL with no localhost dependency.
- **SC-005**: SQLite data survives a container restart (verified by restarting and confirming data is intact).
