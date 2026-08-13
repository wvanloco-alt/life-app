import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  activityLogs,
  activityTypes,
  dailyMetrics,
  garminConnections,
  habitLogs,
  habits,
  sleepLogs,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { getWeekStartDate, toISODate } from "@/lib/dates";
import { countDoneInWindow } from "@/lib/habit-streaks";
import { safeParseMetrics } from "@/lib/activity-metrics";
import { and, eq, gte, inArray } from "drizzle-orm";
import { format, subDays } from "date-fns";
import type { DashboardData } from "@/types";

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const today = toISODate(new Date());
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const weekStart = getWeekStartDate();

  const garminRow = await db
    .select({ id: garminConnections.id, lastSyncedAt: garminConnections.lastSyncedAt })
    .from(garminConnections)
    .where(eq(garminConnections.userId, userId))
    .limit(1);
  const garminConnected = garminRow.length > 0;
  const lastSyncedAt = garminRow[0]?.lastSyncedAt ?? null;

  const sleepRows = await db
    .select()
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.date, weekStart)));

  const allSleep = await db
    .select()
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, userId));

  const sortedSleep = [...allSleep].sort((a, b) => b.date.localeCompare(a.date));
  const lastNightRow =
    sortedSleep.find((r) => r.date <= today) ?? sortedSleep[0] ?? null;

  const weekSleepScores = sleepRows
    .map((r) => r.score)
    .filter((s): s is number => s != null);

  const metricRows = await db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), gte(dailyMetrics.date, weekStart)));

  const yesterdayMetrics = await db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), eq(dailyMetrics.date, yesterday)))
    .limit(1);

  const weekCalories = metricRows
    .map((r) => r.caloriesTotal)
    .filter((c): c is number => c != null);

  const runningType = await db
    .select({ id: activityTypes.id })
    .from(activityTypes)
    .where(and(eq(activityTypes.userId, userId), eq(activityTypes.name, "Running")))
    .limit(1);

  const weekLogs = await db
    .select({
      date: activityLogs.date,
      activityTypeId: activityLogs.activityTypeId,
      metrics: activityLogs.metrics,
    })
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), gte(activityLogs.date, weekStart)));

  let kmRunThisWeek = 0;
  if (runningType.length > 0) {
    const runningId = runningType[0].id;
    for (const log of weekLogs) {
      if (log.activityTypeId !== runningId) continue;
      const metrics = safeParseMetrics(log.metrics);
      const km = metrics.distance_km;
      if (typeof km === "number" && Number.isFinite(km)) {
        kmRunThisWeek += km;
      }
    }
  }
  kmRunThisWeek = Math.round(kmRunThisWeek * 10) / 10;

  const activeHabits = await db
    .select({
      id: habits.id,
      name: habits.name,
      color: habits.color,
    })
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));

  const habitIds = activeHabits.map((h) => h.id);
  const since30 = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const habitLogRows =
    habitIds.length === 0
      ? []
      : await db
          .select({ habitId: habitLogs.habitId, date: habitLogs.date })
          .from(habitLogs)
          .where(
            and(
              eq(habitLogs.userId, userId),
              inArray(habitLogs.habitId, habitIds),
              gte(habitLogs.date, since30)
            )
          );

  const logsByHabit = new Map<number, string[]>();
  for (const row of habitLogRows) {
    const list = logsByHabit.get(row.habitId) ?? [];
    list.push(row.date);
    logsByHabit.set(row.habitId, list);
  }

  const payload: DashboardData = {
    garminConnected,
    lastSyncedAt,
    sleep: {
      lastNight: lastNightRow
        ? {
            date: lastNightRow.date,
            score: lastNightRow.score ?? 0,
            durationMinutes: lastNightRow.durationMinutes ?? 0,
          }
        : null,
      weekAverage: average(weekSleepScores),
    },
    calories: {
      yesterday: yesterdayMetrics[0]?.caloriesTotal ?? null,
      weekDailyAverage: average(weekCalories),
    },
    activities: {
      thisWeek: weekLogs.length,
      kmRunThisWeek,
    },
    habits: activeHabits.map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      doneLast30Days: countDoneInWindow(logsByHabit.get(h.id) ?? [], 30, today),
    })),
  };

  return NextResponse.json(payload);
}
