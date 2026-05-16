/**
 * Shared reset logic for scripts/reset-user-data.cjs and apply-schema.js
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {{ confirm?: boolean }} options
 * @returns {{ results: { label: string; n: number }[]; total: number }}
 */
function resetUserDataById(db, userId, options = {}) {
  const confirm = options.confirm === true;

  function tableExists(name) {
    const row = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name);
    return !!row;
  }

  function runStep({ label, countSql, deleteSql, params = [] }) {
    const n = db.prepare(countSql).get(...params).c;
    if (confirm && n > 0) {
      db.prepare(deleteSql).run(...params);
    }
    return { label, n };
  }

  const steps = [];

  steps.push({
    label: "weekly_focus_goals",
    countSql: `SELECT COUNT(*) AS c FROM weekly_focus_goals WHERE weekly_plan_id IN (SELECT id FROM weekly_plans WHERE user_id = ?) OR goal_id IN (SELECT id FROM goals WHERE user_id = ?)`,
    deleteSql: `DELETE FROM weekly_focus_goals WHERE weekly_plan_id IN (SELECT id FROM weekly_plans WHERE user_id = ?) OR goal_id IN (SELECT id FROM goals WHERE user_id = ?)`,
    params: [userId, userId],
  });

  if (tableExists("training_phases")) {
    steps.push({
      label: "training_phases",
      countSql: `SELECT COUNT(*) AS c FROM training_phases WHERE training_plan_id IN (SELECT id FROM training_plans WHERE user_id = ?)`,
      deleteSql: `DELETE FROM training_phases WHERE training_plan_id IN (SELECT id FROM training_plans WHERE user_id = ?)`,
      params: [userId],
    });
  }

  const userTables = [
    "activity_logs",
    "activities",
    "training_plans",
    "goal_tallies",
    "goal_session_patterns",
    "goal_roles",
    "goals",
    "habit_logs",
    "habits",
    "recurring_activities",
    "weekly_plans",
    "roles",
    "activity_types",
    "planned_expenses",
    "spending_entries",
    "spending_categories",
    "body_metrics",
    "income_entries",
    "fixed_costs",
    "budget_settings",
    "scheduler_blackout_dates",
    "scheduler_settings",
  ];

  for (const table of userTables) {
    if (!tableExists(table)) continue;

    if (table.startsWith("goal_")) {
      steps.push({
        label: table,
        countSql: `SELECT COUNT(*) AS c FROM ${table} WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?)`,
        deleteSql: `DELETE FROM ${table} WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?)`,
        params: [userId],
      });
      continue;
    }

    steps.push({
      label: table,
      countSql: `SELECT COUNT(*) AS c FROM ${table} WHERE user_id = ?`,
      deleteSql: `DELETE FROM ${table} WHERE user_id = ?`,
      params: [userId],
    });
  }

  const results = confirm
    ? db.transaction(() => steps.map((step) => runStep(step)))()
    : steps.map((step) => {
        const n = db.prepare(step.countSql).get(...(step.params || [])).c;
        return { label: step.label, n };
      });

  const total = results.reduce((sum, { n }) => sum + n, 0);
  return { results, total };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 * @param {{ confirm?: boolean }} options
 */
function resetUserDataByUsername(db, username, options = {}) {
  const user = db
    .prepare("SELECT id, username, role, is_active FROM users WHERE username = ?")
    .get(username);

  if (!user) {
    return { ok: false, error: `No user found with username "${username}"` };
  }

  const { results, total } = resetUserDataById(db, user.id, options);
  return { ok: true, user, results, total };
}

module.exports = { resetUserDataById, resetUserDataByUsername };
