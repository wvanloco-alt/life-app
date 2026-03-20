import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goalTallies, goals } from "@/db/schema";
import { eq, and, gte, lte, type SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions: SQL[] = [];
  if (goalId) conditions.push(eq(goalTallies.goalId, parseInt(goalId)));
  if (from) conditions.push(gte(goalTallies.date, from));
  if (to) conditions.push(lte(goalTallies.date, to));

  const rows = conditions.length > 0
    ? await db.select().from(goalTallies).where(and(...conditions))
    : await db.select().from(goalTallies);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { goalId, date, count, notes } = body;

  if (!goalId || !date) {
    return NextResponse.json(
      { error: "goalId and date are required" },
      { status: 400 }
    );
  }

  const goalExists = await db.select({ id: goals.id }).from(goals).where(eq(goals.id, goalId));
  if (goalExists.length === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const [created] = await db
    .insert(goalTallies)
    .values({
      goalId,
      date,
      count: count ?? 1,
      notes: notes?.trim() || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
