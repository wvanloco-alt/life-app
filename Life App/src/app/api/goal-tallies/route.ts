import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goalTallies, goals } from "@/db/schema";
import { eq, and, gte, lte, type SQL } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Scope to goals belonging to this user via a join
  const userGoalIds = (await db.select({ id: goals.id }).from(goals).where(eq(goals.userId, userId))).map((g) => g.id);

  const conditions: SQL[] = [eq(goals.userId, userId)];
  if (goalId) conditions.push(eq(goalTallies.goalId, parseInt(goalId)));
  if (from) conditions.push(gte(goalTallies.date, from));
  if (to) conditions.push(lte(goalTallies.date, to));

  const rows = await db
    .select({ tally: goalTallies })
    .from(goalTallies)
    .innerJoin(goals, eq(goalTallies.goalId, goals.id))
    .where(
      and(
        eq(goals.userId, userId),
        ...(goalId ? [eq(goalTallies.goalId, parseInt(goalId))] : []),
        ...(from ? [gte(goalTallies.date, from)] : []),
        ...(to ? [lte(goalTallies.date, to)] : [])
      )
    );

  return NextResponse.json(rows.map((r) => r.tally));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { goalId, date, count, notes } = body;

  if (!goalId || !date) return NextResponse.json({ error: "goalId and date are required" }, { status: 400 });

  const goalExists = await db.select({ id: goals.id }).from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (goalExists.length === 0) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const [created] = await db.insert(goalTallies).values({ goalId, date, count: count ?? 1, notes: notes?.trim() || null }).returning();
  return NextResponse.json(created, { status: 201 });
}
