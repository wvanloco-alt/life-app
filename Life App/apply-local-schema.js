const Database = require("better-sqlite3");
const db = new Database("./life-app.db");
db.pragma("journal_mode = WAL");

const stmts = [
  `ALTER TABLE goals ADD COLUMN preferred_days TEXT`,
  `ALTER TABLE goals ADD COLUMN preferred_time_slot TEXT`,
  `CREATE TABLE IF NOT EXISTS goal_session_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    label TEXT NOT NULL,
    rest_days_after INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS training_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL,
    discipline TEXT NOT NULL DEFAULT '',
    periodization_model TEXT NOT NULL,
    climber_level TEXT NOT NULL DEFAULT '',
    max_boulder_grade TEXT NOT NULL DEFAULT '',
    max_sport_grade TEXT NOT NULL DEFAULT '',
    years_experience INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS training_plans_goal_id_unique ON training_plans (goal_id)`,
  `CREATE TABLE IF NOT EXISTS training_phases (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    training_plan_id INTEGER NOT NULL,
    phase_type TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    duration_weeks INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'upcoming' NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
    FOREIGN KEY (training_plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
  )`,

  // ─── Multi-sport consolidation migration ───────────────
  `ALTER TABLE training_plans ADD COLUMN sport TEXT NOT NULL DEFAULT 'climbing'`,
  `ALTER TABLE training_plans ADD COLUMN player_level TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE training_plans ADD COLUMN sport_profile TEXT NOT NULL DEFAULT '{}'`,
  `ALTER TABLE training_phases ADD COLUMN limitation_notes TEXT`,

  // Migrate existing climbing plans: populate new columns from old ones
  `UPDATE training_plans SET
    player_level = climber_level,
    sport_profile = json_object(
      'discipline', discipline,
      'maxBoulderGrade', max_boulder_grade,
      'maxSportGrade', max_sport_grade
    )
  WHERE sport = 'climbing' AND player_level = ''`,
];

for (const sql of stmts) {
  try {
    db.exec(sql);
    console.log("OK:", sql.trim().substring(0, 80));
  } catch (e) {
    if (e.message.includes("duplicate") || e.message.includes("already exists")) {
      console.log("SKIP:", sql.trim().substring(0, 80));
    } else {
      console.error("ERR:", e.message);
    }
  }
}

db.close();
console.log("\nDone.");
