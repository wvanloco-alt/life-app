import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, activityLogs, goalTallies } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const goalId = parseInt(id);
  if (isNaN(goalId)) {
    return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = parseInt(searchParams.get("limit") ?? "10", 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;

  const goalRows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (goalRows.length === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const goal = goalRows[0];

  if (goal.activityTypeId != null) {
    const logs = await db
      .select({
        date: activityLogs.date,
        value: activityLogs.durationMinutes,
        notes: activityLogs.notes,
      })
      .from(activityLogs)
      .where(and(eq(activityLogs.goalId, goalId), eq(activityLogs.userId, userId)))
      .orderBy(desc(activityLogs.date))
      .limit(limit);

    return NextResponse.json(
      logs.map((row) => ({
        type: "session" as const,
        date: row.date,
        value: row.value,
        valueLabel: `${row.value} min`,
        notes: row.notes,
      }))
    );
  }

  const tallies = await db
    .select({
      date: goalTallies.date,
      value: goalTallies.count,
      notes: goalTallies.notes,
    })
    .from(goalTallies)
    .where(eq(goalTallies.goalId, goalId))
    .orderBy(desc(goalTallies.date))
    .limit(limit);

  const unit = goal.targetUnit ?? "unit";
  return NextResponse.json(
    tallies.map((row) => ({
      type: "tally" as const,
      date: row.date,
      value: row.value,
      valueLabel: `${row.value} ${unit}`,
      notes: row.notes,
    }))
  );
}
