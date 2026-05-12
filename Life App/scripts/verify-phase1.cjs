/* Quick verification of Phase 1 schema changes. Read-only. */
const Database = require("better-sqlite3");
const db = new Database("./life-app.db", { readonly: true });

function pragma(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

const expectedNewCols = {
  training_plans: [
    "training_sessions_per_week",
    "supplemental_sessions_per_week",
    "training_preferred_days",
    "supplemental_preferred_days",
  ],
  training_phases: [
    "sport_focus_content",
    "supplemental_content",
    "mental_game_content",
  ],
  activities: ["session_type"],
};

let allPresent = true;
for (const [table, cols] of Object.entries(expectedNewCols)) {
  const info = pragma(table);
  const names = info.map((c) => c.name);
  console.log(`\n--- ${table} ---`);
  for (const col of cols) {
    const present = names.includes(col);
    if (!present) allPresent = false;
    const meta = info.find((c) => c.name === col);
    console.log(
      `  [${present ? "OK" : "MISSING"}] ${col}${
        meta ? ` — type=${meta.type}, dflt=${meta.dflt_value ?? "NULL"}, notnull=${meta.notnull}` : ""
      }`
    );
  }
}

console.log("\n--- training_plans backfill ---");
const planRows = db
  .prepare(
    `SELECT tp.id, g.sessions_per_week, tp.training_sessions_per_week AS t, tp.supplemental_sessions_per_week AS s
     FROM training_plans tp INNER JOIN goals g ON g.id = tp.goal_id`
  )
  .all();

if (planRows.length === 0) {
  console.log("  (no existing training plans to backfill — clean DB)");
} else {
  for (const r of planRows) {
    const expectedS = Math.min(2, Math.max(0, r.sessions_per_week - 2));
    const expectedT = r.sessions_per_week - expectedS;
    const ok = r.t === expectedT && r.s === expectedS;
    console.log(
      `  [${ok ? "OK" : "MISMATCH"}] plan_id=${r.id} sessionsPerWeek=${r.sessions_per_week} got=${r.t}+${r.s} expected=${expectedT}+${expectedS}`
    );
  }
}

console.log("\n--- activities session_type sample ---");
const counts = db
  .prepare(`SELECT session_type, COUNT(*) AS c FROM activities GROUP BY session_type`)
  .all();
for (const row of counts) {
  console.log(`  session_type='${row.session_type}' count=${row.c}`);
}

console.log(`\nResult: ${allPresent ? "PASS — all new columns present" : "FAIL — some columns missing"}`);
db.close();
process.exit(allPresent ? 0 : 1);
