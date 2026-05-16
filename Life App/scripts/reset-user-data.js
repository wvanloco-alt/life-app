/**
 * Reset all data for a specific user, keeping the user account intact.
 *
 * Usage (inside Docker):
 *   node /app/scripts/reset-user-data.js <username>
 *
 * Example:
 *   node /app/scripts/reset-user-data.js wvanloco@gmail.com
 *
 * What is deleted (in safe FK order):
 *   habit_logs, habits,
 *   activity_logs, weekly_focus_goals, activities, recurring_activities,
 *   goals (cascades: goal_roles, goal_tallies, goal_session_patterns,
 *                    training_plans → training_phases),
 *   body_metrics, weekly_plans, scheduler_settings, scheduler_blackout_dates,
 *   budget_settings, income_entries, fixed_costs, spending_entries,
 *   spending_categories, planned_expenses, activity_types
 *
 * What is NOT deleted:
 *   The user row itself — the account stays active and loginable.
 */

"use strict";

const Database = require("better-sqlite3");
const path = require("path");

const username = process.argv[2];
if (!username) {
  console.error("Usage: node reset-user-data.js <username>");
  process.exit(1);
}

const dbPath = process.env.DB_PATH || "/data/life-app.db";
console.log(`\nConnecting to database at: ${dbPath}`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── 1. Find the user ─────────────────────────────────────────────────────────

const user = db.prepare("SELECT id, username FROM users WHERE username = ?").get(username);
if (!user) {
  console.error(`\n❌  No user found with username "${username}"`);
  console.log("\nExisting users:");
  const users = db.prepare("SELECT id, username, role FROM users").all();
  users.forEach((u) => console.log(`  - ${u.username} (id: ${u.id}, role: ${u.role})`));
  process.exit(1);
}

const uid = user.id;
console.log(`\nFound user: ${user.username} (id: ${uid})`);

// ── 2. Count rows before deletion ────────────────────────────────────────────

function count(table, column = "user_id") {
  return db.prepare(`SELECT COUNT(*) as n FROM ${table} WHERE ${column} = ?`).get(uid).n;
}

function countViaParent(table, parentTable, parentCol) {
  return db
    .prepare(
      `SELECT COUNT(*) as n FROM ${table}
       WHERE ${parentCol} IN (SELECT id FROM ${parentTable} WHERE user_id = ?)`
    )
    .get(uid).n;
}

console.log("\nRows to be deleted:");
console.log(`  habits            : ${count("habits")}`);
console.log(`  habit_logs        : ${countViaParent("habit_logs", "habits", "habit_id")}`);
console.log(`  activity_logs     : ${count("activity_logs")}`);
console.log(`  activities        : ${count("activities")}`);
console.log(`  recurring_activ.  : ${count("recurring_activities")}`);
console.log(`  goals             : ${count("goals")}`);
console.log(`  body_metrics      : ${count("body_metrics")}`);
console.log(`  weekly_plans      : ${count("weekly_plans")}`);
console.log(`  budget_settings   : ${count("budget_settings")}`);
console.log(`  income_entries    : ${count("income_entries")}`);
console.log(`  fixed_costs       : ${count("fixed_costs")}`);
console.log(`  spending_entries  : ${count("spending_entries")}`);
console.log(`  spending_categ.   : ${count("spending_categories")}`);
console.log(`  planned_expenses  : ${count("planned_expenses")}`);
console.log(`  activity_types    : ${count("activity_types")}`);

// ── 3. Prompt confirmation ───────────────────────────────────────────────────

const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question(
  `\n⚠️  This will permanently delete all data for "${user.username}".\n   Type the username to confirm: `,
  (answer) => {
    rl.close();
    if (answer.trim() !== user.username) {
      console.log("\nAborted — username did not match.");
      process.exit(0);
    }

    // ── 4. Delete in FK-safe order ──────────────────────────────────────────

    const reset = db.transaction(() => {
      // Habits (habit_logs cascade via FK ON DELETE CASCADE)
      db.prepare("DELETE FROM habits WHERE user_id = ?").run(uid);

      // Activity logs (before activities)
      db.prepare("DELETE FROM activity_logs WHERE user_id = ?").run(uid);

      // Weekly focus goals (references both weekly_plans and goals — delete before both)
      db.prepare(
        "DELETE FROM weekly_focus_goals WHERE weekly_plan_id IN (SELECT id FROM weekly_plans WHERE user_id = ?)"
      ).run(uid);

      // Activities (before goals — no cascade from goals to activities)
      db.prepare("DELETE FROM activities WHERE user_id = ?").run(uid);

      // Recurring activities
      db.prepare("DELETE FROM recurring_activities WHERE user_id = ?").run(uid);

      // Goals (cascades: goal_roles, goal_tallies, goal_session_patterns,
      //                   training_plans → training_phases)
      db.prepare("DELETE FROM goals WHERE user_id = ?").run(uid);

      // Remaining user tables
      db.prepare("DELETE FROM body_metrics WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM weekly_plans WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM scheduler_settings WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM scheduler_blackout_dates WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM budget_settings WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM income_entries WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM fixed_costs WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM spending_entries WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM spending_categories WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM planned_expenses WHERE user_id = ?").run(uid);
      db.prepare("DELETE FROM activity_types WHERE user_id = ?").run(uid);
    });

    reset();
    console.log(`\n✅  All data for "${user.username}" has been deleted.`);
    console.log("   The user account is intact — they can still log in.");
  }
);
