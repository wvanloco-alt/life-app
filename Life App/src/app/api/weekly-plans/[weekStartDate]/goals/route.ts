import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeklyFocusGoals, weeklyPlans, goals, goalRoles, roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deriveQuadrant } from "@/lib/quadrants";

async function attachRoles(goalIds: number[]) {
  if (goalIds.length === 0) return new Map<number, { id: number; name: string; color: string }[]>();

  const allGR = await db
    .select({
      goalId: goalRoles.goalId,
      roleId: roles.id,
      roleName: roles.name,
      roleColor: roles.color,
    })
    .from(goalRoles)
    .innerJoin(roles, eq(goalRoles.roleId, roles.id));

  const map = new Map<number, { id: number; name: string; color: string }[]>();
  for (const row of allGR) {
    if (!goalIds.includes(row.goalId)) continue;
    const arr = map.get(row.goalId) ?? [];
    arr.push({ id: row.roleId, name: row.roleName, color: row.roleColor });
    map.set(row.goalId, arr);
  }
  return map;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ weekStartDate: string }> }
) {
  const { weekStartDate } = await params;

  const plan = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.weekStartDate, weekStartDate));

  if (plan.length === 0) {
    return NextResponse.json([]);
  }

  const focusRows = await db
    .select({
      focusId: weeklyFocusGoals.id,
      goalId: goals.id,
      title: goals.title,
      description: goals.description,
      targetDate: goals.targetDate,
      status: goals.status,
      isCompleted: goals.isCompleted,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
    })
    .from(weeklyFocusGoals)
    .innerJoin(goals, eq(weeklyFocusGoals.goalId, goals.id))
    .where(eq(weeklyFocusGoals.weeklyPlanId, plan[0].id));

  const goalIds = focusRows.map((r) => r.goalId);
  const roleMap = await attachRoles(goalIds);

  const result = focusRows.map((row) => ({
    id: row.goalId,
    focusId: row.focusId,
    title: row.title,
    description: row.description,
    quadrant: deriveQuadrant(row.targetDate),
    targetDate: row.targetDate,
    status: row.status,
    isCompleted: row.isCompleted,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    roles: roleMap.get(row.goalId) ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ weekStartDate: string }> }
) {
  const { weekStartDate } = await params;
  const body = await request.json();
  const { goalId } = body;

  if (!goalId) {
    return NextResponse.json(
      { error: "goalId is required" },
      { status: 400 }
    );
  }

  let plan = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.weekStartDate, weekStartDate));

  if (plan.length === 0) {
    const [created] = await db
      .insert(weeklyPlans)
      .values({ weekStartDate })
      .returning();
    plan = [created];
  }

  const existing = await db
    .select()
    .from(weeklyFocusGoals)
    .where(
      and(
        eq(weeklyFocusGoals.weeklyPlanId, plan[0].id),
        eq(weeklyFocusGoals.goalId, goalId)
      )
    );

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Goal is already in focus for this week" },
      { status: 409 }
    );
  }

  const [focus] = await db
    .insert(weeklyFocusGoals)
    .values({
      weeklyPlanId: plan[0].id,
      goalId,
    })
    .returning();

  return NextResponse.json(focus, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ weekStartDate: string }> }
) {
  const { weekStartDate } = await params;
  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");

  if (!goalId) {
    return NextResponse.json(
      { error: "goalId query param is required" },
      { status: 400 }
    );
  }

  const plan = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.weekStartDate, weekStartDate));

  if (plan.length === 0) {
    return NextResponse.json({ success: true });
  }

  await db
    .delete(weeklyFocusGoals)
    .where(
      and(
        eq(weeklyFocusGoals.weeklyPlanId, plan[0].id),
        eq(weeklyFocusGoals.goalId, parseInt(goalId))
      )
    );

  return NextResponse.json({ success: true });
}
