import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  activityLogs,
  activityTypes,
  activities,
  goals,
  goalRoles,
  roles,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activityTypeId = searchParams.get("activityTypeId");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  const allLogs = await db
    .select({
      id: activityLogs.id,
      activityTypeId: activityLogs.activityTypeId,
      activityId: activityLogs.activityId,
      goalId: activityLogs.goalId,
      date: activityLogs.date,
      durationMinutes: activityLogs.durationMinutes,
      calories: activityLogs.calories,
      steps: activityLogs.steps,
      variant: activityLogs.variant,
      metrics: activityLogs.metrics,
      notes: activityLogs.notes,
      createdAt: activityLogs.createdAt,
      activityTypeName: activityTypes.name,
      activityTypeIcon: activityTypes.icon,
    })
    .from(activityLogs)
    .innerJoin(activityTypes, eq(activityLogs.activityTypeId, activityTypes.id));

  let filtered = allLogs;

  if (activityTypeId) {
    filtered = filtered.filter(
      (w) => w.activityTypeId === parseInt(activityTypeId)
    );
  }
  if (date) {
    filtered = filtered.filter((w) => w.date === date);
  }
  if (from) {
    filtered = filtered.filter((w) => w.date >= from);
  }
  if (to) {
    filtered = filtered.filter((w) => w.date <= to);
  }

  filtered.sort((a, b) => b.date.localeCompare(a.date));
  filtered = filtered.slice(0, limit);

  const parsed = filtered.map((w) => ({
    ...w,
    metrics: JSON.parse(w.metrics),
  }));

  return NextResponse.json(parsed);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    activityTypeId,
    activityId,
    goalId,
    date,
    durationMinutes,
    calories,
    steps,
    variant,
    metrics,
    notes,
  } = body;

  if (!activityTypeId || !date || !durationMinutes) {
    return NextResponse.json(
      { error: "activityTypeId, date, and durationMinutes are required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(activityLogs)
    .values({
      activityTypeId,
      activityId: activityId ?? null,
      goalId: goalId ?? null,
      date,
      durationMinutes,
      calories: calories ?? null,
      steps: steps ?? null,
      variant: variant ?? null,
      metrics: JSON.stringify(metrics ?? {}),
      notes: notes?.trim() || null,
    })
    .returning();

  let finalActivityId = created.activityId;

  if (goalId) {
    const goalRows = await db
      .select()
      .from(goals)
      .where(eq(goals.id, goalId));

    if (goalRows.length > 0) {
      const goal = goalRows[0];
      const roleRows = await db
        .select({ roleId: goalRoles.roleId })
        .from(goalRoles)
        .where(eq(goalRoles.goalId, goalId));

      const roleId = roleRows[0]?.roleId ?? null;

      const existingActivity = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.goalId, goalId),
            eq(activities.activityDate, date),
            eq(activities.isCompleted, false)
          )
        );

      let activityToLink: { id: number } | null = null;

      if (existingActivity.length > 0) {
        const [updated] = await db
          .update(activities)
          .set({ isCompleted: true })
          .where(eq(activities.id, existingActivity[0].id))
          .returning({ id: activities.id });
        if (updated) activityToLink = { id: updated.id };
      } else {
        const activityTypeRows = await db
          .select({ name: activityTypes.name })
          .from(activityTypes)
          .where(eq(activityTypes.id, activityTypeId));

        const activityTypeName =
          activityTypeRows[0]?.name ?? "Activity";

        const [newActivity] = await db
          .insert(activities)
          .values({
            title: activityTypeName,
            goalId,
            roleId,
            activityDate: date,
            startTime: "00:00",
            endTime: "00:01",
            isCompleted: true,
            isLogEntry: true,
            quadrant: "Q2",
          })
          .returning({ id: activities.id });

        if (newActivity) activityToLink = { id: newActivity.id };
      }

      if (activityToLink) {
        await db
          .update(activityLogs)
          .set({ activityId: activityToLink.id })
          .where(eq(activityLogs.id, created.id));
        finalActivityId = activityToLink.id;
      }
    }
  }

  // Bidirectional: if no activity linked yet, try to match a scheduled activity by date + activityTypeId
  if (finalActivityId == null) {
    const matchingActivities = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.activityDate, date),
          eq(activities.activityTypeId, activityTypeId),
          eq(activities.isCompleted, false)
        )
      );

    if (matchingActivities.length > 0) {
      const matched = matchingActivities[0];
      await db
        .update(activities)
        .set({ isCompleted: true })
        .where(eq(activities.id, matched.id));
      await db
        .update(activityLogs)
        .set({ activityId: matched.id })
        .where(eq(activityLogs.id, created.id));
      finalActivityId = matched.id;
    }
  }

  const result = {
    ...created,
    activityId: finalActivityId,
    metrics: JSON.parse(created.metrics),
  };

  return NextResponse.json(result, { status: 201 });
}
