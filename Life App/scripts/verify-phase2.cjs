/**
 * Phase 2 verification — Climbing content emission.
 *
 * Reports, for each climbing training plan's phases:
 *   - whether description is populated (should be: legacy field)
 *   - whether sport_focus_content / supplemental_content / mental_game_content
 *     are populated (Phase 2 columns)
 *
 * Phases created BEFORE Phase 2 will have NULL for the three layers — that's
 * expected. To backfill, the user can POST /api/training-plans/refresh-descriptions
 * (T011) from the running app. Phases created AFTER Phase 2 should all have
 * the three layer columns populated.
 *
 * Read-only.
 */
const Database = require("better-sqlite3");
const db = new Database("./life-app.db", { readonly: true });

const plans = db
  .prepare(
    `SELECT tp.id, tp.sport, tp.player_level, tp.start_date,
            tp.training_sessions_per_week AS t, tp.supplemental_sessions_per_week AS s
     FROM training_plans tp
     ORDER BY tp.id`
  )
  .all();

if (plans.length === 0) {
  console.log("(no training plans in the database yet)");
  process.exit(0);
}

for (const plan of plans) {
  console.log(
    `\nPlan ${plan.id} — sport=${plan.sport} level=${plan.player_level} start=${plan.start_date} split=${plan.t}+${plan.s}`
  );
  const phases = db
    .prepare(
      `SELECT id, order_index, phase_type, description,
              sport_focus_content, supplemental_content, mental_game_content
       FROM training_phases WHERE training_plan_id = ? ORDER BY order_index`
    )
    .all(plan.id);
  for (const ph of phases) {
    const desc = ph.description ? `${ph.description.length}c` : "NULL";
    const sf = ph.sport_focus_content ? `${ph.sport_focus_content.length}c` : "NULL";
    const sp = ph.supplemental_content ? `${ph.supplemental_content.length}c` : "NULL";
    const mg = ph.mental_game_content ? `${ph.mental_game_content.length}c` : "NULL";
    const allLayers = sf !== "NULL" && sp !== "NULL" && mg !== "NULL";
    console.log(
      `  [${allLayers ? "OK " : "OLD"}] phase ${ph.id} (#${ph.order_index} ${ph.phase_type}): desc=${desc} sf=${sf} sp=${sp} mg=${mg}`
    );
  }
}

db.close();
