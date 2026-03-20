import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities, roles } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const weekStart = searchParams.get("weekStart");

  if (!date && !weekStart) {
    return NextResponse.json(
      { error: "date or weekStart query param is required" },
      { status: 400 }
    );
  }

  let result;

  if (date) {
    result = await db
      .select({
        id: activities.id,
        goalId: activities.goalId,
        roleId: activities.roleId,
        recurringActivityId: activities.recurringActivityId,
        activityTypeId: activities.activityTypeId,
        title: activities.title,
        quadrant: activities.quadrant,
        activityDate: activities.activityDate,
        startTime: activities.startTime,
        endTime: activities.endTime,
        isCompleted: activities.isCompleted,
        isLogEntry: activities.isLogEntry,
        notes: activities.notes,
        carryForwardFrom: activities.carryForwardFrom,
        createdAt: activities.createdAt,
        updatedAt: activities.updatedAt,
        roleName: roles.name,
        roleColor: roles.color,
      })
      .from(activities)
      .leftJoin(roles, eq(activities.roleId, roles.id))
      .where(eq(activities.activityDate, date));
  } else {
    const dates: string[] = [];
    const start = new Date(weekStart!);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    result = await db
      .select({
        id: activities.id,
        goalId: activities.goalId,
        roleId: activities.roleId,
        recurringActivityId: activities.recurringActivityId,
        activityTypeId: activities.activityTypeId,
        title: activities.title,
        quadrant: activities.quadrant,
        activityDate: activities.activityDate,
        startTime: activities.startTime,
        endTime: activities.endTime,
        isCompleted: activities.isCompleted,
        isLogEntry: activities.isLogEntry,
        notes: activities.notes,
        carryForwardFrom: activities.carryForwardFrom,
        createdAt: activities.createdAt,
        updatedAt: activities.updatedAt,
        roleName: roles.name,
        roleColor: roles.color,
      })
      .from(activities)
      .leftJoin(roles, eq(activities.roleId, roles.id))
      .where(inArray(activities.activityDate, dates));
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, quadrant, activityDate, startTime, endTime, roleId, goalId, notes, isLogEntry, activityTypeId } = body;

  if (!title || !activityDate || !startTime || !endTime) {
    return NextResponse.json(
      { error: "title, activityDate, startTime, and endTime are required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(activities)
    .values({
      title: title.trim(),
      quadrant: quadrant ?? "Q2",
      activityDate,
      startTime,
      endTime,
      roleId: roleId ?? null,
      goalId: goalId ?? null,
      activityTypeId: activityTypeId ?? null,
      notes: notes?.trim() || null,
      isLogEntry: isLogEntry ?? false,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
