const Database = require("better-sqlite3");
const path = require("path");
const dbPath = process.env.DB_PATH || "/data/life-app.db";
console.log("apply-schema: using database at", dbPath);
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const statements = [
  // ─── Users table (friend-release) ──────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL
  )`,

  // ─── user_id columns (friend-release) ─────────────────
  `ALTER TABLE roles ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE weekly_plans ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE goals ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE activities ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE recurring_activities ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE scheduler_settings ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE scheduler_blackout_dates ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE activity_types ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE activity_logs ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE body_metrics ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE budget_settings ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE income_entries ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE fixed_costs ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE spending_entries ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE spending_categories ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE planned_expenses ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE training_plans ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,

  // Goals V2 columns
  `ALTER TABLE goals ADD COLUMN target_unit TEXT`,
  `ALTER TABLE goals ADD COLUMN horizon TEXT`,
  `ALTER TABLE goals ADD COLUMN parent_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE`,
  `ALTER TABLE goals ADD COLUMN month TEXT`,
  // Goals V2 table
  `CREATE TABLE IF NOT EXISTS goal_tallies (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    count INTEGER DEFAULT 1 NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
  )`,
];

for (const sql of statements) {
  try {
    db.exec(sql);
    console.log("OK:", sql.substring(0, 70) + "...");
  } catch (e) {
    if (e.message.includes("duplicate column") || e.message.includes("already exists")) {
      console.log("SKIP (already exists):", sql.substring(0, 70) + "...");
    } else {
      console.error("ERROR:", e.message, "\n  SQL:", sql.substring(0, 80));
    }
  }
}

db.close();
console.log("\nDone.");
