import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  activities,
  activityLogs,
  activityTypes,
  goals,
  trainingPhases,
  trainingPlans,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { getDurationMinutes } from "@/lib/dates";
import { getPhaseDisplayName } from "@/lib/training/periodization";
import type { TodaySession } from "@/types";
import { and, eq, inArray, isNotNull, or, asc } from "drizzle-orm";
import { differenceInCalendarDays, parseISO } from "date-fns";

function extractFocusLine(notes: string | null): string | null {
  if (!notes?.trim()) return null;
  const match = notes.trim().match(/^[^.!?]+[.!?]?/);
  const sentence = (match?.[0] ?? notes.trim()).trim();
  if (sentence.length <= 80) return sentence;
  return `${sentence.slice(0, 77).trim()}...`;
}

function computePhaseWeekNumber(phaseStartDate: string, date: string, totalWeeks: number): number {
  const days = differenceInCalendarDays(parseISO(date), parseISO(phaseStartDate));
  const week = Math.floor(days / 7) + 1;
  return Math.min(Math.max(week, 1), totalWeeks);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date query param required (YYYY-MM-DD)" }, { status: 400 });
  }

  const sessionRows = await db
    .select({
      activityId: activities.id,
      activityTypeId: activities.activityTypeId,
      activityTypeName: activityTypes.name,
      activityTypeIcon: activityTypes.icon,
      defaultDurationMinutes: activityTypes.defaultDurationMinutes,
      goalId: activities.goalId,
      sessionType: activities.sessionType,
      startTime: activities.startTime,
      endTime: activities.endTime,
      isCompleted: activities.isCompleted,
      notes: activities.notes,
      trainingPlanId: trainingPlans.id,
    })
    .from(activities)
    .innerJoin(goals, and(eq(activities.goalId, goals.id), eq(goals.userId, userId)))
    .innerJoin(trainingPlans, eq(trainingPlans.goalId, goals.id))
    .innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(
      and(
        eq(activities.userId, userId),
        eq(activities.activityDate, date),
        isNotNull(activities.goalId),
        or(eq(activities.sessionType, "training"), eq(activities.sessionType, "supplemental"))
      )
    )
    .orderBy(asc(activityTypes.name));

  if (sessionRows.length === 0) {
    return NextResponse.json([]);
  }

  const planIds = [...new Set(sessionRows.map((row) => row.trainingPlanId))];
  const phaseRows = await db
    .select()
    .from(trainingPhases)
    .where(and(inArray(trainingPhases.trainingPlanId, planIds), eq(trainingPhases.status, "active")));

  const phaseByPlan = new Map<number, (typeof phaseRows)[number]>();
  for (const phase of phaseRows) {
    if (phase.phaseType === "rest") continue;
    const existing = phaseByPlan.get(phase.trainingPlanId);
    if (!existing || (phase.updatedAt ?? "") > (existing.updatedAt ?? "")) {
      phaseByPlan.set(phase.trainingPlanId, phase);
    }
  }

  const garminLogs = await db
    .select({ activityTypeId: activityLogs.activityTypeId })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.date, date),
        isNotNull(activityLogs.garminActivityId)
      )
    );

  const garminTypeIds = new Set(
    garminLogs.map((row) => row.activityTypeId).filter((id): id is number => id != null)
  );

  const result: TodaySession[] = [];

  for (const row of sessionRows) {
    const phase = phaseByPlan.get(row.trainingPlanId);
    if (!phase) continue;

    let durationMinutes = getDurationMinutes(row.startTime, row.endTime);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      durationMinutes = row.defaultDurationMinutes;
    }

    result.push({
      activityId: row.activityId,
      activityTypeId: row.activityTypeId!,
      activityTypeName: row.activityTypeName,
      activityTypeIcon: row.activityTypeIcon,
      goalId: row.goalId!,
      sessionType: row.sessionType as "training" | "supplemental",
      durationMinutes,
      isCompleted: row.isCompleted,
      garminLinked: row.isCompleted && garminTypeIds.has(row.activityTypeId!),
      phaseName: getPhaseDisplayName(phase.phaseType),
      phaseWeekNumber: computePhaseWeekNumber(phase.startDate, date, phase.durationWeeks),
      phaseTotalWeeks: phase.durationWeeks,
      focusLine: extractFocusLine(row.notes),
    });
  }

  return NextResponse.json(result);
}
