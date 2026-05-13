import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { activityLogs, activityTypes } from "@/db/schema";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Server-side bridge between scheduled activities and logged workouts.
 *
 * Companion to the existing log-to-activity bridge in
 * `POST /api/activity-logs`. The schedule-to-log bridge fires on the
 * PATCH that flips an activity's `isCompleted` from false to true and
 * inserts a corresponding `activity_logs` row using defaults from
 * `activity_types`.
 *
 * The un-check and delete paths apply a client-supplied `bridgedLogAction`
 * unconditionally (no server-side gate on log existence). The client
 * decides whether to prompt the user based on the `linkedLogId` field
 * on the activity GET shape. The DELETE endpoint surfaces a 409 only as
 * a defensive fallback for clients that did not read `linkedLogId`.
 */

export type BridgedLogAction = "delete" | "unlink";

/**
 * Subset of the Drizzle handle the bridge needs. Production passes the
 * `db` exported from `@/db`; tests pass a `drizzle(":memory:", ...)`
 * handle. Both satisfy this shape — we intentionally do not require the
 * `$client` field that `@/db` adds.
 */
export type DrizzleDb = BetterSQLite3Database<typeof schema>;

/**
 * Parse a raw value (from a JSON body or a URL query parameter) into a
 * BridgedLogAction. Returns `{ value: undefined }` when the field is
 * absent or empty. Returns `null` when the value is present but not a
 * recognized action. The caller responds with 400 on `null`.
 */
export function parseBridgedLogAction(
  raw: unknown
): { value: BridgedLogAction | undefined } | null {
  if (raw === undefined || raw === null || raw === "") {
    return { value: undefined };
  }
  if (raw === "delete" || raw === "unlink") {
    return { value: raw };
  }
  return null;
}

/**
 * Insert an `activity_logs` row for an activity that just transitioned
 * to `isCompleted = true`. Idempotent: skips if a row already references
 * this activity. No-op if the activity has no `activityTypeId` (generic
 * calendar entries are not trackable workouts).
 */
export async function applyCheckOffBridge(
  db: DrizzleDb,
  args: {
    activityId: number;
    userId: string;
    activityTypeId: number | null;
    goalId: number | null;
    activityDate: string;
  }
): Promise<{ inserted: boolean; logId: number | null }> {
  if (args.activityTypeId == null) {
    return { inserted: false, logId: null };
  }

  const existing = await db
    .select({ id: activityLogs.id })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.activityId, args.activityId),
        eq(activityLogs.userId, args.userId)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    return { inserted: false, logId: existing[0].id };
  }

  const typeRows = await db
    .select({
      defaultDurationMinutes: activityTypes.defaultDurationMinutes,
      defaultCalories: activityTypes.defaultCalories,
      defaultSteps: activityTypes.defaultSteps,
    })
    .from(activityTypes)
    .where(eq(activityTypes.id, args.activityTypeId))
    .limit(1);
  if (typeRows.length === 0) {
    return { inserted: false, logId: null };
  }
  const t = typeRows[0];

  const [created] = await db
    .insert(activityLogs)
    .values({
      activityTypeId: args.activityTypeId,
      activityId: args.activityId,
      goalId: args.goalId,
      date: args.activityDate,
      durationMinutes: t.defaultDurationMinutes,
      calories: t.defaultCalories,
      steps: t.defaultSteps,
      metrics: "{}",
      notes: null,
      userId: args.userId,
    })
    .returning({ id: activityLogs.id });

  return { inserted: true, logId: created.id };
}

/**
 * Apply a client-supplied `bridgedLogAction` against any log linked to
 * the un-checked activity. `"delete"` removes the linked log. `"unlink"`
 * nulls out `activity_logs.activityId`. `undefined` is a no-op. The
 * server does not check whether a linked log exists; the client owns
 * that decision via `linkedLogId` on the activity GET shape.
 */
export async function applyUnCheckBridge(
  db: DrizzleDb,
  args: {
    activityId: number;
    userId: string;
    action: BridgedLogAction | undefined;
  }
): Promise<void> {
  if (args.action === "delete") {
    await db
      .delete(activityLogs)
      .where(
        and(
          eq(activityLogs.activityId, args.activityId),
          eq(activityLogs.userId, args.userId)
        )
      );
  } else if (args.action === "unlink") {
    await db
      .update(activityLogs)
      .set({ activityId: null })
      .where(
        and(
          eq(activityLogs.activityId, args.activityId),
          eq(activityLogs.userId, args.userId)
        )
      );
  }
}

/**
 * Pre-DELETE bridge. Discovers any log linked to the activity, then
 * applies the action. If a linked log exists and no action was supplied,
 * returns 409 with the linked log id so the client can prompt. Returns
 * 200 in all other cases (caller proceeds with the activity delete).
 */
export async function applyDeleteBridge(
  db: DrizzleDb,
  args: {
    activityId: number;
    userId: string;
    action: BridgedLogAction | undefined;
  }
): Promise<{ status: 200 } | { status: 409; linkedLogId: number }> {
  const linked = await db
    .select({ id: activityLogs.id })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.activityId, args.activityId),
        eq(activityLogs.userId, args.userId)
      )
    )
    .limit(1);

  if (linked.length === 0) {
    return { status: 200 };
  }

  if (args.action === undefined) {
    return { status: 409, linkedLogId: linked[0].id };
  }

  if (args.action === "delete") {
    await db
      .delete(activityLogs)
      .where(
        and(
          eq(activityLogs.id, linked[0].id),
          eq(activityLogs.userId, args.userId)
        )
      );
  } else {
    await db
      .update(activityLogs)
      .set({ activityId: null })
      .where(
        and(
          eq(activityLogs.id, linked[0].id),
          eq(activityLogs.userId, args.userId)
        )
      );
  }

  return { status: 200 };
}
