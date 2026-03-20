import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeklyPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getWeekStartDate } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get("week");

  const weekStart = weekParam ?? getWeekStartDate(new Date());

  const existing = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.weekStartDate, weekStart));

  if (existing.length > 0) {
    return NextResponse.json(existing[0]);
  }

  const [created] = await db
    .insert(weeklyPlans)
    .values({ weekStartDate: weekStart })
    .returning();

  return NextResponse.json(created);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { weekStartDate, planningNotes, isPlanned } = body;

  if (!weekStartDate) {
    return NextResponse.json(
      { error: "weekStartDate is required" },
      { status: 400 }
    );
  }

  const existing = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.weekStartDate, weekStartDate));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Weekly plan not found" },
      { status: 404 }
    );
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (planningNotes !== undefined) updates.planningNotes = planningNotes;
  if (isPlanned !== undefined) updates.isPlanned = Boolean(isPlanned);

  const [updated] = await db
    .update(weeklyPlans)
    .set(updates)
    .where(eq(weeklyPlans.id, existing[0].id))
    .returning();

  return NextResponse.json(updated);
}
