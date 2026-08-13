import { db } from "@/db";
import {
  activities,
  activityLogs,
  activityTypes,
  dailyMetrics,
  sleepLogs,
} from "@/db/schema";
import { applyCheckOffBridge } from "@/lib/activities-bridge";
import { encrypt, decrypt } from "@/lib/crypto";
import { isFallbackActivityType } from "@/lib/garmin-mapping";
import { fetchGarminData } from "@/lib/garmin-client";
import type { GarminPersistedSession } from "@/lib/garmin-types";
import {
  planGarminSync,
  type GarminSyncApplyCounts,
  type GarminSyncPlan,
} from "@/lib/garmin-sync";
import { DEFAULT_ACTIVITY_TYPES } from "@/lib/defaults";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";

async function ensureActivityType(userId: string, name: string): Promise<number> {
  const existing = await db
    .select({ id: activityTypes.id })
    .from(activityTypes)
    .where(and(eq(activityTypes.userId, userId), eq(activityTypes.name, name)))
    .limit(1);
  if (existing.length > 0) return existing[0].id;

  const defaultType = DEFAULT_ACTIVITY_TYPES.find((t) => t.name === name);
  if (defaultType) {
    const [created] = await db
      .insert(activityTypes)
      .values({
        name: defaultType.name,
        type: defaultType.type,
        icon: defaultType.icon,
        isTracked: defaultType.isTracked,
        defaultCalories: defaultType.defaultCalories,
        defaultSteps: defaultType.defaultSteps,
        metricsConfig: JSON.stringify(defaultType.metricsConfig),
        variants: defaultType.variants ? JSON.stringify(defaultType.variants) : null,
        gradeSystem: defaultType.gradeSystem,
        userId,
      })
      .returning({ id: activityTypes.id });
    return created.id;
  }

  const [created] = await db
    .insert(activityTypes)
    .values({
      name,
      type: "cardio",
      icon: "activity",
      isTracked: true,
      metricsConfig: "[]",
      userId,
    })
    .returning({ id: activityTypes.id });
  return created.id;
}

export async function applyGarminSyncPlan(
  userId: string,
  syncPlan: GarminSyncPlan
): Promise<GarminSyncApplyCounts> {
  let activitiesAdded = 0;
  let sleepRecordsUpserted = 0;
  let dailyMetricsUpdated = 0;
  let sessionsAutoCompleted = 0;

  for (const insert of syncPlan.activityInserts) {
    const activityTypeId = await ensureActivityType(userId, insert.activityTypeName);
    await db.insert(activityLogs).values({
      activityTypeId,
      date: insert.date,
      durationMinutes: insert.durationMinutes,
      calories: insert.calories,
      steps: insert.steps,
      metrics: JSON.stringify(insert.metrics),
      garminActivityId: insert.garminActivityId,
      userId,
    });
    activitiesAdded += 1;
  }

  const now = new Date().toISOString();
  for (const row of syncPlan.sleepUpserts) {
    const existing = await db
      .select({ id: sleepLogs.id })
      .from(sleepLogs)
      .where(and(eq(sleepLogs.userId, userId), eq(sleepLogs.date, row.date)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(sleepLogs)
        .set({
          score: row.score,
          durationMinutes: row.durationMinutes,
          deepSleepMinutes: row.deepSleepMinutes,
          remSleepMinutes: row.remSleepMinutes,
          lightSleepMinutes: row.lightSleepMinutes,
        })
        .where(eq(sleepLogs.id, existing[0].id));
    } else {
      await db.insert(sleepLogs).values({
        userId,
        date: row.date,
        score: row.score,
        durationMinutes: row.durationMinutes,
        deepSleepMinutes: row.deepSleepMinutes,
        remSleepMinutes: row.remSleepMinutes,
        lightSleepMinutes: row.lightSleepMinutes,
        source: "garmin",
      });
    }
    sleepRecordsUpserted += 1;
  }

  for (const row of syncPlan.dailyMetricUpserts) {
    const existing = await db
      .select({ id: dailyMetrics.id })
      .from(dailyMetrics)
      .where(and(eq(dailyMetrics.userId, userId), eq(dailyMetrics.date, row.date)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(dailyMetrics)
        .set({
          caloriesTotal: row.caloriesTotal,
          caloriesActive: row.caloriesActive,
          steps: row.steps,
          updatedAt: now,
        })
        .where(eq(dailyMetrics.id, existing[0].id));
    } else {
      await db.insert(dailyMetrics).values({
        userId,
        date: row.date,
        caloriesTotal: row.caloriesTotal,
        caloriesActive: row.caloriesActive,
        steps: row.steps,
        source: "garmin",
        updatedAt: now,
      });
    }
    dailyMetricsUpdated += 1;
  }

  for (const activityId of syncPlan.sessionsToComplete) {
    const rows = await db
      .select()
      .from(activities)
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)))
      .limit(1);
    if (rows.length === 0 || rows[0].isCompleted) continue;

    await db
      .update(activities)
      .set({ isCompleted: true, updatedAt: now })
      .where(and(eq(activities.id, activityId), eq(activities.userId, userId)));

    await applyCheckOffBridge(db, {
      activityId,
      userId,
      activityTypeId: rows[0].activityTypeId,
      goalId: rows[0].goalId,
      activityDate: rows[0].activityDate,
    });
    sessionsAutoCompleted += 1;
  }

  return {
    activitiesAdded,
    sleepRecordsUpserted,
    dailyMetricsUpdated,
    sessionsAutoCompleted,
  };
}

export async function runGarminSyncForUser(
  userId: string,
  session: GarminPersistedSession,
  days: number
): Promise<{ counts: GarminSyncApplyCounts; session: GarminPersistedSession }> {
  const fetched = await fetchGarminData(session, days);
  const today = format(new Date(), "yyyy-MM-dd");

  const existingIds = await db
    .select({ garminActivityId: activityLogs.garminActivityId })
    .from(activityLogs)
    .where(eq(activityLogs.userId, userId));

  const existingGarminActivityIds = new Set(
    existingIds
      .map((r) => r.garminActivityId)
      .filter((id): id is string => id != null && id.length > 0)
  );

  const scheduledRows = await db
    .select({
      activityId: activities.id,
      activityTypeName: activityTypes.name,
      activityDate: activities.activityDate,
      isCompleted: activities.isCompleted,
    })
    .from(activities)
    .leftJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id))
    .where(and(eq(activities.userId, userId), eq(activities.activityDate, today)));

  const syncPlan = planGarminSync({
    activities: fetched.activities,
    sleep: fetched.sleep,
    dailyMetrics: fetched.dailyMetrics,
    existingGarminActivityIds,
    scheduledSessions: scheduledRows
      .filter((r) => r.activityTypeName != null)
      .map((r) => ({
        activityId: r.activityId,
        activityTypeName: r.activityTypeName!,
        activityDate: r.activityDate,
        isCompleted: r.isCompleted,
      })),
    today,
  });

  const counts = await applyGarminSyncPlan(userId, syncPlan);
  return { counts, session: fetched.session };
}

export function serializeGarminSession(session: GarminPersistedSession): string {
  return encrypt(JSON.stringify(session));
}

export function parseGarminSession(encrypted: string): GarminPersistedSession {
  return JSON.parse(decrypt(encrypted)) as GarminPersistedSession;
}
