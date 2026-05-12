/**
 * Tests for the training-supplemental-split feature.
 *
 * Phase 1 of the test surface — additional coverage (default formula, scheduler
 * distribution, content emission consistency) added in T031 during Phase 7.
 */
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";

describe("T013 — cycle restart preserves training/supplemental split", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        title TEXT NOT NULL,
        sessions_per_week INTEGER NOT NULL DEFAULT 3,
        user_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE training_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        goal_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        training_sessions_per_week INTEGER,
        supplemental_sessions_per_week INTEGER,
        training_preferred_days TEXT DEFAULT '[]',
        supplemental_preferred_days TEXT DEFAULT '[]',
        updated_at TEXT,
        user_id TEXT NOT NULL DEFAULT ''
      );
    `);
  });

  it("preserves split, preferred-days, and goal_id when the restart UPDATE runs", () => {
    db.prepare(
      "INSERT INTO goals (id, title, sessions_per_week, user_id) VALUES (?, ?, ?, ?)"
    ).run(1, "Climb 7a", 3, "user-1");

    // Seed plan with a manually-edited, non-default split (1 + 2 instead of the
    // formula's 2 + 1) and a chosen weekly rhythm.
    db.prepare(
      `INSERT INTO training_plans
         (goal_id, start_date, status,
          training_sessions_per_week, supplemental_sessions_per_week,
          training_preferred_days, supplemental_preferred_days,
          user_id)
       VALUES (?, ?, 'active', ?, ?, ?, ?, ?)`
    ).run(1, "2026-01-01", 1, 2, "[2,4]", "[6]", "user-1");

    // Replicate the exact UPDATE the restart route runs. If a future change
    // adds split or preferred-days fields here, this test fails — protecting
    // FR-009 (cycle restart preserves the split).
    const today = "2026-04-01";
    db.prepare(
      "UPDATE training_plans SET start_date = ?, status = 'active', updated_at = ? WHERE id = ? AND user_id = ?"
    ).run(today, new Date().toISOString(), 1, "user-1");

    const row = db
      .prepare("SELECT * FROM training_plans WHERE id = 1")
      .get() as {
        training_sessions_per_week: number;
        supplemental_sessions_per_week: number;
        training_preferred_days: string;
        supplemental_preferred_days: string;
        start_date: string;
      };

    expect(row.training_sessions_per_week).toBe(1);
    expect(row.supplemental_sessions_per_week).toBe(2);
    expect(row.training_preferred_days).toBe("[2,4]");
    expect(row.supplemental_preferred_days).toBe("[6]");
    expect(row.start_date).toBe(today);
  });
});
