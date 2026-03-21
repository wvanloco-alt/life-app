import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeklyPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getWeekStartDate } from "@/lib/dates";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get("week");
  const weekStart = weekParam ?? getWeekStartDate(new Date());

  const existing = await db.select().from(weeklyPlans).where(and(eq(weeklyPlans.weekStartDate, weekStart), eq(weeklyPlans.userId, userId)));
  if (existing.length > 0) return NextResponse.json(existing[0]);

  const [created] = await db.insert(weeklyPlans).values({ weekStartDate: weekStart, userId }).returning();
  return NextResponse.json(created);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { weekStartDate, planningNotes, isPlanned } = body;

  if (!weekStartDate) return NextResponse.json({ error: "weekStartDate is required" }, { status: 400 });

  const existing = await db.select().from(weeklyPlans).where(and(eq(weeklyPlans.weekStartDate, weekStartDate), eq(weeklyPlans.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Weekly plan not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (planningNotes !== undefined) updates.planningNotes = planningNotes;
  if (isPlanned !== undefined) updates.isPlanned = Boolean(isPlanned);

  const [updated] = await db.update(weeklyPlans).set(updates).where(and(eq(weeklyPlans.id, existing[0].id), eq(weeklyPlans.userId, userId))).returning();
  return NextResponse.json(updated);
}
