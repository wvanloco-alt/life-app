import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, activityLogs, goalTallies } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getDayOfYear,
} from "date-fns";
import type { PaceStatus } from "@/types";

function getPeriodRange(period: string, month?: string | null): { from: string; to: string } {
  const now = new Date();
  if (period === "weekly") {
    return {
      from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  if (period === "monthly") {
    if (month) {
      const d = new Date(`${month}-01`);
      return {
        from: format(startOfMonth(d), "yyyy-MM-dd"),
        to: format(endOfMonth(d), "yyyy-MM-dd"),
      };
    }
    return {
      from: format(startOfMonth(now), "yyyy-MM-dd"),
      to: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }
  if (period === "yearly") {
    return {
      from: format(startOfYear(now), "yyyy-MM-dd"),
      to: format(endOfYear(now), "yyyy-MM-dd"),
    };
  }
  return {
    from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

function sumMetricFromLogs(
  logs: { durationMinutes: number; metrics: string }[],
  metric: string
): number {
  if (metric === "count") return logs.length;
  if (metric === "duration") return logs.reduce((s, l) => s + l.durationMinutes, 0);
  let total = 0;
  for (const log of logs) {
    try {
      const m = JSON.parse(log.metrics) as Record<string, unknown>;
      const val = m[metric];
      if (typeof val === "number") total += val;
    } catch { /* ignore */ }
  }
  return total;
}

function computePaceStatus(
  current: number,
  target: number,
  targetDate: string | null
): { paceStatus: PaceStatus; elapsedPercentage: number } {
  if (target === 0 || current === 0) {
    return { paceStatus: "no_data", elapsedPercentage: 0 };
  }

  const now = new Date();
  const year = targetDate ? new Date(targetDate).getFullYear() : now.getFullYear();
  const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInYear = isLeapYear(year) ? 366 : 365;
  const dayOfYear = getDayOfYear(now);
  const elapsedPercentage = Math.round((dayOfYear / daysInYear) * 100);
  const achievedPercentage = (current / target) * 100;

  let paceStatus: PaceStatus;
  if (achievedPercentage > elapsedPercentage + 5) {
    paceStatus = "ahead";
  } else if (achievedPercentage >= elapsedPercentage - 5) {
    paceStatus = "on_track";
  } else {
    paceStatus = "behind";
  }

  return { paceStatus, elapsedPercentage };
}

export async function GET(
  _request: NextRequest,
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

  const goalRows = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (goalRows.length === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const goal = goalRows[0];

  // --- Yearly goal: aggregate across self + all monthly children ---
  if (goal.horizon === "yearly") {
    const childGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.parentGoalId, goalId));
    const allGoalIds = [goalId, ...childGoals.map((c) => c.id)];

    const targetYear = goal.targetDate
      ? new Date(goal.targetDate).getFullYear()
      : new Date().getFullYear();
    const from = `${targetYear}-01-01`;
    const to = `${targetYear}-12-31`;

    let current = 0;
    const target = goal.targetValue ?? 0;
    const metric = goal.targetMetric;
    const metricLabel = goal.targetUnit
      ?? (metric === "count" ? "sessions" : metric === "duration" ? "minutes" : metric ?? "units");

    if (goal.activityTypeId != null && metric != null) {
      const logs = await db
        .select({ durationMinutes: activityLogs.durationMinutes, metrics: activityLogs.metrics })
        .from(activityLogs)
        .where(
          and(
            inArray(activityLogs.goalId, allGoalIds),
            gte(activityLogs.date, from),
            lte(activityLogs.date, to)
          )
        );
      current += sumMetricFromLogs(logs, metric);
    }

    const tallies = await db
      .select({ count: goalTallies.count })
      .from(goalTallies)
      .where(
        and(
          inArray(goalTallies.goalId, allGoalIds),
          gte(goalTallies.date, from),
          lte(goalTallies.date, to)
        )
      );
    current += tallies.reduce((s, t) => s + t.count, 0);

    const percentage = target > 0
      ? Math.min(100, Math.round((current / target) * 100))
      : 0;

    const { paceStatus, elapsedPercentage } = target > 0
      ? computePaceStatus(current, target, goal.targetDate)
      : { paceStatus: "no_data" as PaceStatus, elapsedPercentage: 0 };

    return NextResponse.json({
      current,
      target,
      percentage,
      period: "yearly",
      metricLabel,
      paceStatus,
      elapsedPercentage,
    });
  }

  // --- Monthly goal: scope to its specific month ---
  if (goal.horizon === "monthly" && goal.month) {
    const { from, to } = getPeriodRange("monthly", goal.month);
    const target = goal.targetValue ?? 0;
    const metric = goal.targetMetric;
    const metricLabel = goal.targetUnit
      ?? (metric === "count" ? "sessions" : metric === "duration" ? "minutes" : metric ?? "units");
    let current = 0;

    if (goal.activityTypeId != null && metric != null) {
      const logs = await db
        .select({ durationMinutes: activityLogs.durationMinutes, metrics: activityLogs.metrics })
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.goalId, goalId),
            gte(activityLogs.date, from),
            lte(activityLogs.date, to)
          )
        );
      current += sumMetricFromLogs(logs, metric);
    }

    const tallies = await db
      .select({ count: goalTallies.count })
      .from(goalTallies)
      .where(
        and(
          eq(goalTallies.goalId, goalId),
          gte(goalTallies.date, from),
          lte(goalTallies.date, to)
        )
      );
    current += tallies.reduce((s, t) => s + t.count, 0);

    const percentage = target > 0
      ? Math.min(100, Math.round((current / target) * 100))
      : 0;

    return NextResponse.json({
      current,
      target,
      percentage,
      period: "monthly",
      metricLabel,
    });
  }

  // --- Standalone goal with metric-based tracking (existing behavior) ---
  if (
    goal.activityTypeId != null &&
    goal.targetMetric != null &&
    goal.targetValue != null &&
    goal.targetPeriod != null
  ) {
    const { from, to } = getPeriodRange(goal.targetPeriod);
    const metric = goal.targetMetric;
    const target = goal.targetValue;

    const logs = await db
      .select({ durationMinutes: activityLogs.durationMinutes, metrics: activityLogs.metrics })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.goalId, goalId),
          gte(activityLogs.date, from),
          lte(activityLogs.date, to)
        )
      );

    let current = sumMetricFromLogs(logs, metric);

    const tallies = await db
      .select({ count: goalTallies.count })
      .from(goalTallies)
      .where(
        and(
          eq(goalTallies.goalId, goalId),
          gte(goalTallies.date, from),
          lte(goalTallies.date, to)
        )
      );
    current += tallies.reduce((s, t) => s + t.count, 0);

    const metricLabel = goal.targetUnit
      ?? (metric === "count" ? "sessions" : metric === "duration" ? "minutes" : metric);

    return NextResponse.json({
      current,
      target,
      percentage: Math.min(100, Math.round((current / target) * 100)),
      period: goal.targetPeriod,
      metricLabel,
    });
  }

  // --- Standalone session-based goal (existing fallback) ---
  const { from, to } = getPeriodRange("weekly");
  const sessionLogs = await db
    .select()
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.goalId, goalId),
        gte(activityLogs.date, from),
        lte(activityLogs.date, to)
      )
    );

  const tallies = await db
    .select({ count: goalTallies.count })
    .from(goalTallies)
    .where(
      and(
        eq(goalTallies.goalId, goalId),
        gte(goalTallies.date, from),
        lte(goalTallies.date, to)
      )
    );

  const current = sessionLogs.length + tallies.reduce((s, t) => s + t.count, 0);
  const target = goal.sessionsPerWeek ?? 3;

  return NextResponse.json({
    current,
    target,
    percentage: Math.min(100, Math.round((current / target) * 100)),
    period: "weekly",
    metricLabel: goal.targetUnit ?? "sessions",
  });
}
