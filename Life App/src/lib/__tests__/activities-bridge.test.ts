/**
 * Unit tests for the server bridges between scheduled activities and
 * logged workouts (Phase 2 of activities-refactoring).
 *
 * Covers:
 *  - parseBridgedLogAction: valid, undefined/null/empty, invalid
 *  - applyCheckOffBridge: insert with type defaults, idempotency,
 *    skip when activityTypeId is null, defensive skip on bad FK
 *  - applyUnCheckBridge: delete, unlink, no-op for undefined,
 *    user-scope isolation
 *  - applyDeleteBridge: 200 with no linked log, 409 when present and
 *    action is undefined, delete/unlink branches, user-scope isolation
 */
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import {
  applyCheckOffBridge,
  applyUnCheckBridge,
  applyDeleteBridge,
  parseBridgedLogAction,
} from "../activities-bridge";

// ─── Test harness ─────────────────────────────────────────────────────────────

type Db = BetterSQLite3Database<typeof schema>;

function setupTestDb(): { sqlite: InstanceType<typeof Database>; db: Db } {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      sessions_per_week INTEGER NOT NULL DEFAULT 3,
      user_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE activity_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'cardio',
      icon TEXT NOT NULL DEFAULT '',
      is_tracked INTEGER NOT NULL DEFAULT 0,
      default_calories INTEGER,
      default_steps INTEGER,
      default_duration_minutes INTEGER NOT NULL DEFAULT 60,
      metrics_config TEXT NOT NULL DEFAULT '[]',
      variants TEXT,
      grade_system TEXT,
      user_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      goal_id INTEGER,
      role_id INTEGER,
      recurring_activity_id INTEGER,
      activity_type_id INTEGER,
      title TEXT NOT NULL,
      quadrant TEXT NOT NULL DEFAULT 'Q2',
      activity_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_from_log INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      carry_forward_from TEXT,
      session_type TEXT NOT NULL DEFAULT 'training',
      user_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      activity_type_id INTEGER NOT NULL,
      activity_id INTEGER,
      goal_id INTEGER,
      date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      calories INTEGER,
      steps INTEGER,
      variant TEXT,
      metrics TEXT NOT NULL DEFAULT '{}',
      notes TEXT,
      user_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const db = drizzle(sqlite, { schema }) as Db;
  return { sqlite, db };
}

function seedActivityType(
  sqlite: InstanceType<typeof Database>,
  args: {
    id: number;
    name: string;
    durationMinutes?: number;
    calories?: number | null;
    steps?: number | null;
    userId?: string;
  }
): void {
  sqlite
    .prepare(
      `INSERT INTO activity_types
       (id, name, default_duration_minutes, default_calories, default_steps, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      args.id,
      args.name,
      args.durationMinutes ?? 60,
      args.calories ?? null,
      args.steps ?? null,
      args.userId ?? "user-1"
    );
}

function seedActivity(
  sqlite: InstanceType<typeof Database>,
  args: {
    id: number;
    activityTypeId: number | null;
    goalId?: number | null;
    isCompleted?: boolean;
    userId?: string;
    activityDate?: string;
  }
): void {
  sqlite
    .prepare(
      `INSERT INTO activities
       (id, title, activity_date, start_time, end_time, activity_type_id, goal_id, is_completed, user_id)
       VALUES (?, ?, ?, '09:00', '10:00', ?, ?, ?, ?)`
    )
    .run(
      args.id,
      "Test activity",
      args.activityDate ?? "2026-03-15",
      args.activityTypeId,
      args.goalId ?? null,
      args.isCompleted ? 1 : 0,
      args.userId ?? "user-1"
    );
}

function seedActivityLog(
  sqlite: InstanceType<typeof Database>,
  args: {
    id: number;
    activityTypeId: number;
    activityId: number | null;
    userId?: string;
    date?: string;
  }
): void {
  sqlite
    .prepare(
      `INSERT INTO activity_logs
       (id, activity_type_id, activity_id, date, duration_minutes, user_id)
       VALUES (?, ?, ?, ?, 60, ?)`
    )
    .run(
      args.id,
      args.activityTypeId,
      args.activityId,
      args.date ?? "2026-03-15",
      args.userId ?? "user-1"
    );
}

function countLogs(
  sqlite: InstanceType<typeof Database>,
  where: { activityId?: number; userId?: string } = {}
): number {
  let sql = "SELECT COUNT(*) as c FROM activity_logs WHERE 1=1";
  const params: unknown[] = [];
  if (where.activityId !== undefined) {
    sql += " AND activity_id = ?";
    params.push(where.activityId);
  }
  if (where.userId !== undefined) {
    sql += " AND user_id = ?";
    params.push(where.userId);
  }
  const row = sqlite.prepare(sql).get(...params) as { c: number };
  return row.c;
}

// ─── parseBridgedLogAction ────────────────────────────────────────────────────

describe("parseBridgedLogAction", () => {
  it("accepts 'delete'", () => {
    expect(parseBridgedLogAction("delete")).toEqual({ value: "delete" });
  });

  it("accepts 'unlink'", () => {
    expect(parseBridgedLogAction("unlink")).toEqual({ value: "unlink" });
  });

  it("treats undefined as absent", () => {
    expect(parseBridgedLogAction(undefined)).toEqual({ value: undefined });
  });

  it("treats null as absent (URL searchParams.get returns null when missing)", () => {
    expect(parseBridgedLogAction(null)).toEqual({ value: undefined });
  });

  it("treats empty string as absent", () => {
    expect(parseBridgedLogAction("")).toEqual({ value: undefined });
  });

  it("rejects unknown strings", () => {
    expect(parseBridgedLogAction("weird")).toBeNull();
    expect(parseBridgedLogAction("DELETE")).toBeNull();
  });

  it("rejects non-string types", () => {
    expect(parseBridgedLogAction(123)).toBeNull();
    expect(parseBridgedLogAction({})).toBeNull();
    expect(parseBridgedLogAction(true)).toBeNull();
  });
});

// ─── applyCheckOffBridge ──────────────────────────────────────────────────────

describe("applyCheckOffBridge", () => {
  let sqlite: InstanceType<typeof Database>;
  let db: Db;

  beforeEach(() => {
    ({ sqlite, db } = setupTestDb());
  });

  it("inserts a log using activity_types defaults", async () => {
    seedActivityType(sqlite, {
      id: 7,
      name: "Climbing",
      durationMinutes: 90,
      calories: 450,
      steps: 0,
    });
    seedActivity(sqlite, {
      id: 1,
      activityTypeId: 7,
      goalId: 42,
      activityDate: "2026-03-15",
    });

    const result = await applyCheckOffBridge(db, {
      activityId: 1,
      userId: "user-1",
      activityTypeId: 7,
      goalId: 42,
      activityDate: "2026-03-15",
    });

    expect(result.inserted).toBe(true);
    expect(result.logId).toBeTypeOf("number");

    const row = sqlite
      .prepare(`SELECT * FROM activity_logs WHERE id = ?`)
      .get(result.logId) as {
        activity_type_id: number;
        activity_id: number;
        goal_id: number;
        date: string;
        duration_minutes: number;
        calories: number;
        steps: number;
        user_id: string;
        metrics: string;
      };

    expect(row.activity_type_id).toBe(7);
    expect(row.activity_id).toBe(1);
    expect(row.goal_id).toBe(42);
    expect(row.date).toBe("2026-03-15");
    expect(row.duration_minutes).toBe(90);
    expect(row.calories).toBe(450);
    expect(row.steps).toBe(0);
    expect(row.user_id).toBe("user-1");
    expect(row.metrics).toBe("{}");
  });

  it("propagates null calories/steps from activity_types", async () => {
    seedActivityType(sqlite, {
      id: 7,
      name: "Yoga",
      durationMinutes: 45,
      calories: null,
      steps: null,
    });
    seedActivity(sqlite, { id: 1, activityTypeId: 7 });

    const result = await applyCheckOffBridge(db, {
      activityId: 1,
      userId: "user-1",
      activityTypeId: 7,
      goalId: null,
      activityDate: "2026-03-15",
    });

    expect(result.inserted).toBe(true);
    const row = sqlite
      .prepare(`SELECT calories, steps, goal_id FROM activity_logs WHERE id = ?`)
      .get(result.logId) as {
        calories: number | null;
        steps: number | null;
        goal_id: number | null;
      };
    expect(row.calories).toBeNull();
    expect(row.steps).toBeNull();
    expect(row.goal_id).toBeNull();
  });

  it("is idempotent: a second invocation does not insert another log", async () => {
    seedActivityType(sqlite, { id: 7, name: "Climbing" });
    seedActivity(sqlite, { id: 1, activityTypeId: 7 });

    const first = await applyCheckOffBridge(db, {
      activityId: 1,
      userId: "user-1",
      activityTypeId: 7,
      goalId: null,
      activityDate: "2026-03-15",
    });
    expect(first.inserted).toBe(true);

    const second = await applyCheckOffBridge(db, {
      activityId: 1,
      userId: "user-1",
      activityTypeId: 7,
      goalId: null,
      activityDate: "2026-03-15",
    });
    expect(second.inserted).toBe(false);
    expect(second.logId).toBe(first.logId);

    expect(countLogs(sqlite, { activityId: 1 })).toBe(1);
  });

  it("treats a pre-existing log linked by the log-to-activity bridge as the idempotency target", async () => {
    seedActivityType(sqlite, { id: 7, name: "Climbing" });
    seedActivity(sqlite, { id: 1, activityTypeId: 7 });
    seedActivityLog(sqlite, { id: 99, activityTypeId: 7, activityId: 1 });

    const result = await applyCheckOffBridge(db, {
      activityId: 1,
      userId: "user-1",
      activityTypeId: 7,
      goalId: null,
      activityDate: "2026-03-15",
    });

    expect(result.inserted).toBe(false);
    expect(result.logId).toBe(99);
    expect(countLogs(sqlite, { activityId: 1 })).toBe(1);
  });

  it("does not insert when activityTypeId is null (generic calendar entry)", async () => {
    seedActivity(sqlite, { id: 1, activityTypeId: null });

    const result = await applyCheckOffBridge(db, {
      activityId: 1,
      userId: "user-1",
      activityTypeId: null,
      goalId: null,
      activityDate: "2026-03-15",
    });

    expect(result.inserted).toBe(false);
    expect(result.logId).toBeNull();
    expect(countLogs(sqlite)).toBe(0);
  });

  it("defensively skips when the referenced activity_type row is missing", async () => {
    seedActivity(sqlite, { id: 1, activityTypeId: 999 });

    const result = await applyCheckOffBridge(db, {
      activityId: 1,
      userId: "user-1",
      activityTypeId: 999,
      goalId: null,
      activityDate: "2026-03-15",
    });

    expect(result.inserted).toBe(false);
    expect(result.logId).toBeNull();
    expect(countLogs(sqlite)).toBe(0);
  });

  it("scopes idempotency lookup to the calling user (another user's log does not block insert)", async () => {
    seedActivityType(sqlite, { id: 7, name: "Climbing" });
    seedActivity(sqlite, { id: 1, activityTypeId: 7, userId: "user-1" });
    // A log row referencing activity_id = 1 but owned by a different user.
    seedActivityLog(sqlite, {
      id: 99,
      activityTypeId: 7,
      activityId: 1,
      userId: "user-other",
    });

    const result = await applyCheckOffBridge(db, {
      activityId: 1,
      userId: "user-1",
      activityTypeId: 7,
      goalId: null,
      activityDate: "2026-03-15",
    });

    expect(result.inserted).toBe(true);
    expect(countLogs(sqlite, { activityId: 1 })).toBe(2);
  });
});

// ─── applyUnCheckBridge ───────────────────────────────────────────────────────

describe("applyUnCheckBridge", () => {
  let sqlite: InstanceType<typeof Database>;
  let db: Db;

  beforeEach(() => {
    ({ sqlite, db } = setupTestDb());
    seedActivityType(sqlite, { id: 7, name: "Climbing" });
    seedActivity(sqlite, { id: 1, activityTypeId: 7, isCompleted: true });
    seedActivityLog(sqlite, { id: 99, activityTypeId: 7, activityId: 1 });
  });

  it("with action 'delete' removes the linked log", async () => {
    await applyUnCheckBridge(db, {
      activityId: 1,
      userId: "user-1",
      action: "delete",
    });
    expect(countLogs(sqlite, { activityId: 1 })).toBe(0);
    expect(countLogs(sqlite)).toBe(0);
  });

  it("with action 'unlink' nulls activity_id but keeps the log row", async () => {
    await applyUnCheckBridge(db, {
      activityId: 1,
      userId: "user-1",
      action: "unlink",
    });
    expect(countLogs(sqlite, { activityId: 1 })).toBe(0);
    expect(countLogs(sqlite)).toBe(1);
    const row = sqlite
      .prepare(`SELECT activity_id FROM activity_logs WHERE id = 99`)
      .get() as { activity_id: number | null };
    expect(row.activity_id).toBeNull();
  });

  it("with action undefined leaves the linked log untouched (no-op)", async () => {
    await applyUnCheckBridge(db, {
      activityId: 1,
      userId: "user-1",
      action: undefined,
    });
    expect(countLogs(sqlite, { activityId: 1 })).toBe(1);
    const row = sqlite
      .prepare(`SELECT activity_id FROM activity_logs WHERE id = 99`)
      .get() as { activity_id: number | null };
    expect(row.activity_id).toBe(1);
  });

  it("does not touch logs owned by other users (user-scope isolation)", async () => {
    seedActivityLog(sqlite, {
      id: 200,
      activityTypeId: 7,
      activityId: 1,
      userId: "user-other",
    });

    await applyUnCheckBridge(db, {
      activityId: 1,
      userId: "user-1",
      action: "delete",
    });

    expect(countLogs(sqlite, { userId: "user-1" })).toBe(0);
    expect(countLogs(sqlite, { userId: "user-other" })).toBe(1);
  });
});

// ─── applyDeleteBridge ────────────────────────────────────────────────────────

describe("applyDeleteBridge", () => {
  let sqlite: InstanceType<typeof Database>;
  let db: Db;

  beforeEach(() => {
    ({ sqlite, db } = setupTestDb());
    seedActivityType(sqlite, { id: 7, name: "Climbing" });
  });

  it("returns 200 when no log is linked (clean delete)", async () => {
    seedActivity(sqlite, { id: 1, activityTypeId: 7 });

    const result = await applyDeleteBridge(db, {
      activityId: 1,
      userId: "user-1",
      action: undefined,
    });

    expect(result.status).toBe(200);
  });

  it("returns 409 with linkedLogId when a log is linked and action is undefined", async () => {
    seedActivity(sqlite, { id: 1, activityTypeId: 7 });
    seedActivityLog(sqlite, { id: 99, activityTypeId: 7, activityId: 1 });

    const result = await applyDeleteBridge(db, {
      activityId: 1,
      userId: "user-1",
      action: undefined,
    });

    expect(result.status).toBe(409);
    if (result.status === 409) {
      expect(result.linkedLogId).toBe(99);
    }
    // Log is preserved so the client can prompt and retry.
    expect(countLogs(sqlite, { activityId: 1 })).toBe(1);
  });

  it("with action 'delete' removes the linked log and returns 200", async () => {
    seedActivity(sqlite, { id: 1, activityTypeId: 7 });
    seedActivityLog(sqlite, { id: 99, activityTypeId: 7, activityId: 1 });

    const result = await applyDeleteBridge(db, {
      activityId: 1,
      userId: "user-1",
      action: "delete",
    });

    expect(result.status).toBe(200);
    expect(countLogs(sqlite)).toBe(0);
  });

  it("with action 'unlink' nulls activity_id and returns 200", async () => {
    seedActivity(sqlite, { id: 1, activityTypeId: 7 });
    seedActivityLog(sqlite, { id: 99, activityTypeId: 7, activityId: 1 });

    const result = await applyDeleteBridge(db, {
      activityId: 1,
      userId: "user-1",
      action: "unlink",
    });

    expect(result.status).toBe(200);
    expect(countLogs(sqlite)).toBe(1);
    const row = sqlite
      .prepare(`SELECT activity_id FROM activity_logs WHERE id = 99`)
      .get() as { activity_id: number | null };
    expect(row.activity_id).toBeNull();
  });

  it("a foreign user's log does not trigger the 409 gate", async () => {
    seedActivity(sqlite, { id: 1, activityTypeId: 7, userId: "user-1" });
    seedActivityLog(sqlite, {
      id: 99,
      activityTypeId: 7,
      activityId: 1,
      userId: "user-other",
    });

    const result = await applyDeleteBridge(db, {
      activityId: 1,
      userId: "user-1",
      action: undefined,
    });

    expect(result.status).toBe(200);
    // The foreign log is untouched.
    expect(countLogs(sqlite, { userId: "user-other" })).toBe(1);
  });
});
