import { mapGarminActivityType } from "./garmin-mapping";
import type {
  GarminActivityRecord,
  GarminDailyMetricRecord,
  GarminSleepRecord,
} from "./garmin-types";

export interface ScheduledSessionForSync {
  activityId: number;
  activityTypeName: string;
  activityDate: string;
  isCompleted: boolean;
}

export interface ActivityInsertPlan {
  garminActivityId: string;
  activityTypeName: string;
  date: string;
  durationMinutes: number;
  calories: number | null;
  steps: number | null;
  metrics: Record<string, number>;
}

export interface SleepUpsertPlan {
  date: string;
  score: number | null;
  durationMinutes: number;
  deepSleepMinutes: number | null;
  remSleepMinutes: number | null;
  lightSleepMinutes: number | null;
}

export interface DailyMetricUpsertPlan {
  date: string;
  caloriesTotal: number | null;
  caloriesActive: number | null;
  steps: number | null;
}

export interface GarminSyncPlan {
  activityInserts: ActivityInsertPlan[];
  sleepUpserts: SleepUpsertPlan[];
  dailyMetricUpserts: DailyMetricUpsertPlan[];
  sessionsToComplete: number[];
}

export interface GarminSyncPlanInput {
  activities: GarminActivityRecord[];
  sleep: GarminSleepRecord[];
  dailyMetrics: GarminDailyMetricRecord[];
  existingGarminActivityIds: Set<string>;
  scheduledSessions: ScheduledSessionForSync[];
  today: string;
}

export function planGarminSync(input: GarminSyncPlanInput): GarminSyncPlan {
  const activityInserts: ActivityInsertPlan[] = [];
  const sessionsToComplete = new Set<number>();

  for (const activity of input.activities) {
    if (input.existingGarminActivityIds.has(activity.garminActivityId)) {
      continue;
    }

    const activityTypeName = mapGarminActivityType(activity.typeKey);
    const metrics: Record<string, number> = {};
    if (activity.distanceMeters != null && activity.distanceMeters > 0) {
      metrics.distance_km = Math.round((activity.distanceMeters / 1000) * 100) / 100;
    }

    activityInserts.push({
      garminActivityId: activity.garminActivityId,
      activityTypeName,
      date: activity.date,
      durationMinutes: activity.durationMinutes,
      calories: activity.calories,
      steps: activity.steps,
      metrics,
    });

    if (activity.date !== input.today) continue;

    for (const session of input.scheduledSessions) {
      if (session.isCompleted) continue;
      if (session.activityDate !== activity.date) continue;
      if (session.activityTypeName !== activityTypeName) continue;
      sessionsToComplete.add(session.activityId);
    }
  }

  return {
    activityInserts,
    sleepUpserts: input.sleep.map((s) => ({
      date: s.date,
      score: s.score,
      durationMinutes: s.durationMinutes,
      deepSleepMinutes: s.deepSleepMinutes,
      remSleepMinutes: s.remSleepMinutes,
      lightSleepMinutes: s.lightSleepMinutes,
    })),
    dailyMetricUpserts: input.dailyMetrics.map((d) => ({
      date: d.date,
      caloriesTotal: d.caloriesTotal,
      caloriesActive: d.caloriesActive,
      steps: d.steps,
    })),
    sessionsToComplete: [...sessionsToComplete],
  };
}

export interface GarminSyncApplyCounts {
  activitiesAdded: number;
  sleepRecordsUpserted: number;
  dailyMetricsUpdated: number;
  sessionsAutoCompleted: number;
}
