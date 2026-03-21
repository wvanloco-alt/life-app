const Database = require("better-sqlite3");
const path = require("path");
const dbPath = process.env.DB_PATH || "/data/life-app.db";
console.log("apply-schema: using database at", dbPath);
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Helper: run each statement, skip if already exists ─────────────────────

function run(sql) {
  try {
    db.exec(sql);
    console.log("OK:", sql.trim().substring(0, 80));
  } catch (e) {
    if (
      e.message.includes("duplicate column") ||
      e.message.includes("already exists") ||
      e.message.includes("UNIQUE constraint")
    ) {
      console.log("SKIP:", sql.trim().substring(0, 80));
    } else {
      console.error("ERROR:", e.message, "\n  SQL:", sql.trim().substring(0, 120));
    }
  }
}

// ─── 1. Create all tables (safe on fresh DB and existing DB) ─────────────────

const createStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    is_work_role INTEGER NOT NULL DEFAULT 0,
    max_weekly_occurrences INTEGER NOT NULL DEFAULT 7,
    min_rest_days INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    week_start_date TEXT NOT NULL,
    planning_notes TEXT,
    is_planned INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    sessions_per_week INTEGER NOT NULL DEFAULT 3,
    activity_type_id INTEGER,
    target_metric TEXT,
    target_value REAL,
    target_period TEXT,
    target_unit TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    is_completed INTEGER NOT NULL DEFAULT 0,
    horizon TEXT,
    parent_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    month TEXT,
    preferred_days TEXT,
    preferred_time_slot TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS goal_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS goal_tallies (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS goal_session_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    label TEXT NOT NULL,
    rest_days_after INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS weekly_focus_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    weekly_plan_id INTEGER NOT NULL REFERENCES weekly_plans(id),
    goal_id INTEGER NOT NULL REFERENCES goals(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS activity_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'cardio',
    icon TEXT NOT NULL DEFAULT '🏃',
    is_tracked INTEGER NOT NULL DEFAULT 0,
    default_calories INTEGER,
    default_steps INTEGER,
    metrics_config TEXT NOT NULL DEFAULT '[]',
    variants TEXT,
    grade_system TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS recurring_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    title TEXT NOT NULL,
    quadrant TEXT NOT NULL DEFAULT 'Q2',
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_paused INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER REFERENCES goals(id),
    role_id INTEGER REFERENCES roles(id),
    recurring_activity_id INTEGER REFERENCES recurring_activities(id),
    activity_type_id INTEGER REFERENCES activity_types(id),
    title TEXT NOT NULL,
    quadrant TEXT NOT NULL DEFAULT 'Q2',
    activity_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    is_log_entry INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    carry_forward_from TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    activity_type_id INTEGER NOT NULL REFERENCES activity_types(id),
    activity_id INTEGER REFERENCES activities(id),
    goal_id INTEGER REFERENCES goals(id),
    date TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    calories INTEGER,
    steps INTEGER,
    variant TEXT,
    metrics TEXT NOT NULL DEFAULT '{}',
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    date TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS scheduler_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    work_start_time TEXT NOT NULL DEFAULT '09:00',
    work_end_time TEXT NOT NULL DEFAULT '17:00',
    work_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
    enforce_weekly_spread INTEGER NOT NULL DEFAULT 1,
    max_activities_per_day INTEGER NOT NULL DEFAULT 4,
    user_id TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS scheduler_blackout_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    date TEXT NOT NULL,
    label TEXT,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS budget_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    monthly_savings_target REAL NOT NULL DEFAULT 0,
    savings_goal_total REAL,
    savings_goal_target_date TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS income_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    source TEXT NOT NULL,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS fixed_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    start_month TEXT NOT NULL,
    end_month TEXT,
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS spending_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    is_itemized INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS spending_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📦',
    color TEXT NOT NULL DEFAULT '#6B7280',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS planned_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    category_id INTEGER REFERENCES spending_categories(id),
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS training_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL UNIQUE REFERENCES goals(id) ON DELETE CASCADE,
    sport TEXT NOT NULL DEFAULT 'climbing',
    periodization_model TEXT NOT NULL,
    player_level TEXT NOT NULL,
    years_experience INTEGER NOT NULL,
    sport_profile TEXT NOT NULL DEFAULT '{}',
    start_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS training_phases (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    training_plan_id INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    phase_type TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    duration_weeks INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    description TEXT NOT NULL,
    limitation_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

for (const sql of createStatements) {
  run(sql);
}

// ─── 2. Add columns to existing tables (migration — safe to re-run) ──────────
// These are no-ops if columns already exist (SQLite throws "duplicate column").

const alterStatements = [
  `ALTER TABLE goals ADD COLUMN target_unit TEXT`,
  `ALTER TABLE goals ADD COLUMN horizon TEXT`,
  `ALTER TABLE goals ADD COLUMN parent_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE`,
  `ALTER TABLE goals ADD COLUMN month TEXT`,
  `ALTER TABLE goals ADD COLUMN preferred_days TEXT`,
  `ALTER TABLE goals ADD COLUMN preferred_time_slot TEXT`,
];

for (const sql of alterStatements) {
  run(sql);
}

db.close();
console.log("\napply-schema: done.");
