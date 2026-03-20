const Database = require("better-sqlite3");
const db = new Database("/data/life-app.db");
db.pragma("journal_mode = WAL");

const statements = [
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
