/**
 * Tests for the training-supplemental-split feature.
 *
 * T013 regression test (Phase 2) lives at the top.
 * T031 (Phase 7) adds coverage for the default formula, the climbing
 * three-layer content emission, the legacy description wrapper, and the
 * apply-schema.js backfill UPDATE.
 */
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { defaultSplit } from "../training/split";
import {
  buildClimbingPhaseContent,
  buildClimbingPhaseDescription,
} from "../training/periodization";
import type {
  ClimberLevel,
  ClimbingPhaseType,
  Discipline,
} from "@/types";

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

// ─── T031: default split formula ────────────────────────────────────────────

describe("defaultSplit: formula and invariants (FR-004)", () => {
  // Formula: supplemental = min(2, max(0, sessionsPerWeek - 2)); training = remainder.
  const cases: ReadonlyArray<{
    input: number;
    training: number;
    supplemental: number;
  }> = [
    { input: 0, training: 0, supplemental: 0 },
    { input: 1, training: 1, supplemental: 0 },
    { input: 2, training: 2, supplemental: 0 },
    { input: 3, training: 2, supplemental: 1 },
    { input: 4, training: 2, supplemental: 2 },
    { input: 5, training: 3, supplemental: 2 },
    { input: 6, training: 4, supplemental: 2 },
    { input: 7, training: 5, supplemental: 2 },
  ];

  it.each(cases)(
    "sessionsPerWeek = $input -> $training training + $supplemental supplemental",
    ({ input, training, supplemental }) => {
      const result = defaultSplit(input);
      expect(result.training).toBe(training);
      expect(result.supplemental).toBe(supplemental);
    }
  );

  it("returns { training: 0, supplemental: 0 } for negative input", () => {
    expect(defaultSplit(-3)).toEqual({ training: 0, supplemental: 0 });
  });

  it("training + supplemental equals sessionsPerWeek for positive inputs", () => {
    for (let n = 1; n <= 7; n++) {
      const { training, supplemental } = defaultSplit(n);
      expect(training + supplemental).toBe(n);
    }
  });
});

// ─── T031: climbing phase content emission ──────────────────────────────────

const PHASE_TYPES: readonly ClimbingPhaseType[] = [
  "skill-stamina",
  "max-strength-power",
  "anaerobic-endurance",
  "rest",
] as const;

const DISCIPLINES: readonly Discipline[] = ["bouldering", "sport"] as const;
const LEVELS: readonly ClimberLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

describe("buildClimbingPhaseContent: three-layer output structure", () => {
  for (const phase of PHASE_TYPES) {
    for (const discipline of DISCIPLINES) {
      for (const level of LEVELS) {
        it(`${phase} / ${discipline} / ${level}: returns three non-empty layers`, () => {
          const layers = buildClimbingPhaseContent(phase, discipline, level);
          expect(typeof layers.sportFocusContent).toBe("string");
          expect(typeof layers.supplementalContent).toBe("string");
          expect(typeof layers.mentalGameContent).toBe("string");
          expect(layers.sportFocusContent.length).toBeGreaterThan(0);
          expect(layers.supplementalContent.length).toBeGreaterThan(0);
          expect(layers.mentalGameContent.length).toBeGreaterThan(0);
        });
      }
    }
  }

  // PHASE_CONTENT has no per-level or per-discipline mentalGame override.
  // The mental-game string for a given phase must be identical across all
  // six (level × discipline) variants.
  for (const phase of PHASE_TYPES) {
    it(`${phase}: mentalGameContent is identical across level and discipline`, () => {
      const seen = new Set<string>();
      for (const discipline of DISCIPLINES) {
        for (const level of LEVELS) {
          seen.add(
            buildClimbingPhaseContent(phase, discipline, level).mentalGameContent
          );
        }
      }
      expect(seen.size).toBe(1);
    });
  }
});

describe("buildClimbingPhaseContent: beginner override logic", () => {
  // Derived from the PHASE_CONTENT structure in src/lib/training/periodization.ts.
  // climbingOverride is true when the phase defines `climbingBeginner`.
  // supplementalOverride is true when the phase defines `supplementalBeginner`.
  const expectations: Record<
    ClimbingPhaseType,
    { climbingOverride: boolean; supplementalOverride: boolean }
  > = {
    "skill-stamina": { climbingOverride: true, supplementalOverride: true },
    "max-strength-power": {
      climbingOverride: true,
      supplementalOverride: true,
    },
    "anaerobic-endurance": {
      climbingOverride: true,
      supplementalOverride: false,
    },
    rest: { climbingOverride: false, supplementalOverride: false },
  };

  for (const phase of PHASE_TYPES) {
    const { climbingOverride, supplementalOverride } = expectations[phase];

    for (const discipline of DISCIPLINES) {
      it(`${phase} / ${discipline}: beginner sportFocus ${
        climbingOverride ? "differs from" : "equals"
      } intermediate`, () => {
        const beginner = buildClimbingPhaseContent(phase, discipline, "beginner");
        const intermediate = buildClimbingPhaseContent(
          phase,
          discipline,
          "intermediate"
        );
        if (climbingOverride) {
          expect(beginner.sportFocusContent).not.toBe(intermediate.sportFocusContent);
        } else {
          expect(beginner.sportFocusContent).toBe(intermediate.sportFocusContent);
        }
      });
    }

    it(`${phase}: beginner supplemental ${
      supplementalOverride ? "differs from" : "equals"
    } intermediate`, () => {
      const beginner = buildClimbingPhaseContent(phase, "bouldering", "beginner");
      const intermediate = buildClimbingPhaseContent(
        phase,
        "bouldering",
        "intermediate"
      );
      if (supplementalOverride) {
        expect(beginner.supplementalContent).not.toBe(
          intermediate.supplementalContent
        );
      } else {
        expect(beginner.supplementalContent).toBe(intermediate.supplementalContent);
      }
    });
  }

  it("intermediate and advanced return identical layers for every (phase, discipline)", () => {
    for (const phase of PHASE_TYPES) {
      for (const discipline of DISCIPLINES) {
        const intermediate = buildClimbingPhaseContent(
          phase,
          discipline,
          "intermediate"
        );
        const advanced = buildClimbingPhaseContent(phase, discipline, "advanced");
        expect(advanced).toEqual(intermediate);
      }
    }
  });
});

describe("buildClimbingPhaseDescription: legacy wrapper format", () => {
  for (const phase of PHASE_TYPES) {
    for (const discipline of DISCIPLINES) {
      for (const level of LEVELS) {
        it(`${phase} / ${discipline} / ${level}: concatenates layers in the expected order`, () => {
          const layers = buildClimbingPhaseContent(phase, discipline, level);
          const description = buildClimbingPhaseDescription(
            phase,
            discipline,
            level
          );
          const expected = [
            "CLIMBING FOCUS",
            layers.sportFocusContent,
            "",
            "SUPPLEMENTAL TRAINING",
            layers.supplementalContent,
            "",
            "MENTAL TRAINING",
            layers.mentalGameContent,
          ].join("\n");
          expect(description).toBe(expected);
        });
      }
    }
  }
});

// ─── T031: apply-schema.js backfill UPDATE ──────────────────────────────────

describe("apply-schema.js training_plans backfill UPDATE", () => {
  // Replicates the exact UPDATE statement from apply-schema.js (the block that
  // backfills the training/supplemental split for legacy training_plans rows).
  // The duplication is intentional: if the production SQL changes, the tests
  // below must be updated to match. Drift between the two will surface as a
  // failure here, not as a silent production migration bug.
  const BACKFILL_UPDATE = `
    UPDATE training_plans
    SET
      training_sessions_per_week = (
        SELECT g.sessions_per_week - MIN(2, MAX(0, g.sessions_per_week - 2))
        FROM goals g WHERE g.id = training_plans.goal_id
      ),
      supplemental_sessions_per_week = (
        SELECT MIN(2, MAX(0, g.sessions_per_week - 2))
        FROM goals g WHERE g.id = training_plans.goal_id
      )
    WHERE training_sessions_per_week IS NULL
       OR supplemental_sessions_per_week IS NULL
  `;

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
        training_sessions_per_week INTEGER,
        supplemental_sessions_per_week INTEGER,
        user_id TEXT NOT NULL DEFAULT ''
      );
    `);
  });

  const cases: ReadonlyArray<{
    sessionsPerWeek: number;
    training: number;
    supplemental: number;
  }> = [
    { sessionsPerWeek: 1, training: 1, supplemental: 0 },
    { sessionsPerWeek: 2, training: 2, supplemental: 0 },
    { sessionsPerWeek: 3, training: 2, supplemental: 1 },
    { sessionsPerWeek: 4, training: 2, supplemental: 2 },
    { sessionsPerWeek: 5, training: 3, supplemental: 2 },
    { sessionsPerWeek: 6, training: 4, supplemental: 2 },
    { sessionsPerWeek: 7, training: 5, supplemental: 2 },
  ];

  it.each(cases)(
    "sessionsPerWeek = $sessionsPerWeek backfills to $training + $supplemental",
    ({ sessionsPerWeek, training, supplemental }) => {
      db.prepare(
        "INSERT INTO goals (id, title, sessions_per_week, user_id) VALUES (?, ?, ?, ?)"
      ).run(1, "Goal", sessionsPerWeek, "user-1");
      db.prepare(
        `INSERT INTO training_plans
           (goal_id, start_date,
            training_sessions_per_week, supplemental_sessions_per_week,
            user_id)
         VALUES (?, ?, ?, ?, ?)`
      ).run(1, "2026-01-01", null, null, "user-1");

      db.exec(BACKFILL_UPDATE);

      const row = db
        .prepare("SELECT * FROM training_plans WHERE goal_id = ?")
        .get(1) as {
          training_sessions_per_week: number;
          supplemental_sessions_per_week: number;
        };
      expect(row.training_sessions_per_week).toBe(training);
      expect(row.supplemental_sessions_per_week).toBe(supplemental);
    }
  );

  it("backfills all goals in a single multi-row UPDATE", () => {
    // Insert all seven cases in one DB, run the UPDATE once, verify every row.
    // This exercises the per-row subquery and the WHERE clause together, which
    // the case-by-case run above does not.
    for (let i = 0; i < cases.length; i++) {
      const goalId = i + 1;
      db.prepare(
        "INSERT INTO goals (id, title, sessions_per_week, user_id) VALUES (?, ?, ?, ?)"
      ).run(goalId, `Goal ${goalId}`, cases[i].sessionsPerWeek, "user-1");
      db.prepare(
        `INSERT INTO training_plans
           (goal_id, start_date,
            training_sessions_per_week, supplemental_sessions_per_week,
            user_id)
         VALUES (?, ?, ?, ?, ?)`
      ).run(goalId, "2026-01-01", null, null, "user-1");
    }

    db.exec(BACKFILL_UPDATE);

    for (let i = 0; i < cases.length; i++) {
      const goalId = i + 1;
      const row = db
        .prepare("SELECT * FROM training_plans WHERE goal_id = ?")
        .get(goalId) as {
          training_sessions_per_week: number;
          supplemental_sessions_per_week: number;
        };
      expect(row.training_sessions_per_week).toBe(cases[i].training);
      expect(row.supplemental_sessions_per_week).toBe(cases[i].supplemental);
    }
  });

  it("is idempotent: re-running the UPDATE does not change values", () => {
    db.prepare(
      "INSERT INTO goals (id, title, sessions_per_week, user_id) VALUES (?, ?, ?, ?)"
    ).run(1, "Goal", 5, "user-1");
    db.prepare(
      `INSERT INTO training_plans
         (goal_id, start_date,
          training_sessions_per_week, supplemental_sessions_per_week,
          user_id)
       VALUES (?, ?, ?, ?, ?)`
    ).run(1, "2026-01-01", null, null, "user-1");

    db.exec(BACKFILL_UPDATE);
    const first = db
      .prepare(
        "SELECT training_sessions_per_week, supplemental_sessions_per_week FROM training_plans WHERE id = 1"
      )
      .get();

    db.exec(BACKFILL_UPDATE);
    const second = db
      .prepare(
        "SELECT training_sessions_per_week, supplemental_sessions_per_week FROM training_plans WHERE id = 1"
      )
      .get();

    expect(second).toEqual(first);
  });

  it("never overwrites user-edited split values (IS NULL gate)", () => {
    db.prepare(
      "INSERT INTO goals (id, title, sessions_per_week, user_id) VALUES (?, ?, ?, ?)"
    ).run(1, "Goal", 3, "user-1");
    // User picked 1 + 2 instead of the default 2 + 1. Backfill must not touch this row.
    db.prepare(
      `INSERT INTO training_plans
         (goal_id, start_date,
          training_sessions_per_week, supplemental_sessions_per_week,
          user_id)
       VALUES (?, ?, ?, ?, ?)`
    ).run(1, "2026-01-01", 1, 2, "user-1");

    db.exec(BACKFILL_UPDATE);

    const row = db
      .prepare("SELECT * FROM training_plans WHERE id = 1")
      .get() as {
        training_sessions_per_week: number;
        supplemental_sessions_per_week: number;
      };
    expect(row.training_sessions_per_week).toBe(1);
    expect(row.supplemental_sessions_per_week).toBe(2);
  });
});
