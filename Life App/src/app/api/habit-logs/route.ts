import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { habits, habitLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * Validate an ISO YYYY-MM-DD date string. Both the format and the calendar
 * date must be valid (e.g., "2026-02-30" passes the regex but is rejected
 * by the round-trip check).
 *
 * Returns true for valid, false otherwise. Defensive: never throws.
 */
function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  // `Date.UTC` doesn't validate; we round-trip through Date and verify the
  // calendar components survive (catches things like Feb 30 or Apr 31).
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * POST /api/habit-logs
 *
 * Body: `{ habitId: number, date: string }`. Idempotent (spec FR-011): an
 * already-existing `(habit_id, date)` row produces 201 with the existing row,
 * not 409 or 200. The client doesn't have to branch on response status.
 *
 * The unique index `habit_logs_habit_date_unique` is the source of truth for
 * "at most one log per habit per day." We rely on it to enforce uniqueness
 * and catch the race where two concurrent requests target the same cell.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const habitId = Number(body.habitId);

  if (!Number.isInteger(habitId) || habitId <= 0) {
    return NextResponse.json({ error: "habitId must be a positive integer" }, { status: 400 });
  }

  if (!isValidIsoDate(body.date)) {
    return NextResponse.json({ error: "date must be a valid ISO YYYY-MM-DD string" }, { status: 400 });
  }
  const date = body.date as string;

  // 404 for habit-not-found AND cross-user habit (spec FR-035: never reveal
  // whether the id exists for another user).
  const habit = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  if (habit.length === 0) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

  // Try insert first; on the unique-index collision, fetch and return the
  // existing row. This is the simplest idempotent pattern; the alternative
  // (SELECT first then INSERT) has a race that lets two concurrent requests
  // both pass the SELECT and one of them hit the unique constraint anyway.
  try {
    const [created] = await db
      .insert(habitLogs)
      .values({ userId, habitId, date })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("UNIQUE constraint failed")) {
      const [existing] = await db
        .select()
        .from(habitLogs)
        .where(
          and(
            eq(habitLogs.userId, userId),
            eq(habitLogs.habitId, habitId),
            eq(habitLogs.date, date),
          ),
        );
      // Defensive: if the row vanished between the failed insert and this
      // select (e.g., concurrent DELETE), retry the insert once. In practice
      // this is rare; the retry keeps the contract "POST always returns 201."
      if (!existing) {
        const [retried] = await db
          .insert(habitLogs)
          .values({ userId, habitId, date })
          .returning();
        return NextResponse.json(retried, { status: 201 });
      }
      return NextResponse.json(existing, { status: 201 });
    }
    throw e;
  }
}

/**
 * DELETE /api/habit-logs
 *
 * Body: `{ habitId: number, date: string }`. Idempotent (spec FR-012): always
 * returns 204, regardless of whether the row existed. The client doesn't have
 * to branch on response status.
 *
 * Auth and cross-user safety: we still 404 if the habit itself doesn't belong
 * to this user (spec FR-035), so the endpoint can't be used to probe other
 * users' habit ids.
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const habitId = Number(body.habitId);

  if (!Number.isInteger(habitId) || habitId <= 0) {
    return NextResponse.json({ error: "habitId must be a positive integer" }, { status: 400 });
  }

  if (!isValidIsoDate(body.date)) {
    return NextResponse.json({ error: "date must be a valid ISO YYYY-MM-DD string" }, { status: 400 });
  }
  const date = body.date as string;

  const habit = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  if (habit.length === 0) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

  await db
    .delete(habitLogs)
    .where(
      and(
        eq(habitLogs.userId, userId),
        eq(habitLogs.habitId, habitId),
        eq(habitLogs.date, date),
      ),
    );

  return new NextResponse(null, { status: 204 });
}
