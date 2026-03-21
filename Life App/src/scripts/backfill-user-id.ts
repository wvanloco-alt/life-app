/**
 * One-time backfill script: sets user_id on all existing rows to the admin user.
 * Run ONCE after the Phase 2 migration, before Phase 3 API changes go live.
 * Run with: npx tsx src/scripts/backfill-user-id.ts
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "life-app.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as { id: string } | undefined;

if (!adminUser) {
  console.error("\nNo admin user found. Run create-admin.ts first.\n");
  process.exit(1);
}

const adminId = adminUser.id;
console.log(`\nBackfilling user_id = ${adminId} (admin)\n`);

const tables = [
  "roles",
  "weekly_plans",
  "goals",
  "activities",
  "recurring_activities",
  "scheduler_settings",
  "scheduler_blackout_dates",
  "activity_types",
  "activity_logs",
  "body_metrics",
  "budget_settings",
  "income_entries",
  "fixed_costs",
  "spending_entries",
  "spending_categories",
  "planned_expenses",
  "training_plans",
];

for (const table of tables) {
  try {
    const result = db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id = ''`).run(adminId);
    console.log(`  ${table}: ${result.changes} rows updated`);
  } catch (e) {
    console.error(`  ${table}: ERROR — ${(e as Error).message}`);
  }
}

db.close();
console.log("\nBackfill complete.\n");
