# Life App 2.0 — Session Progress

## 2026-08-10 — Phases 1–2 complete

**Branch**: `life-app-2.0` (local only, not pushed)

### What changed

- **T001–T003 (Setup)**: Created branch; added `nodemailer@^7.0.13` and `garmin-connect-client@^2.0.0` (optional — Linux/macOS only); created `.env.local` with `ENCRYPTION_KEY` + `CRON_SECRET`; documented new env vars in `DEPLOYMENT.md` and `.env.example`.
- **T004–T007 (Foundational)**: Added 4 new tables + `activity_logs.garmin_activity_id` to `schema.ts` and `apply-schema.js`; created `src/lib/crypto.ts` + tests; added Life App 2.0 types to `src/types/index.ts`; fixed test fixture for new column.

### Verification

- `apply-schema.js` run twice on scratch DB — idempotent (all new tables/indexes SKIP on second run).
- `npm run build` — passes.
- `npm run test:run` — 370 tests pass (after fixture fix).

### Blocker / note for Wim

**`garmin-connect-client` does not install on Windows** — it depends on `node-libcurl-ja3` (Linux/macOS only). Listed as `optionalDependencies` so `npm install` on Windows still succeeds. Garmin connect/sync will work in **Docker** and on **Railway**. For Phase 3 Garmin testing on your machine, use `docker compose up` or we test after deploy.

### Next task

**T008** — `src/lib/garmin-mapping.ts` (Phase 3, US1 Garmin)
