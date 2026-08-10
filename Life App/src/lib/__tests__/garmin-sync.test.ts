import { describe, expect, it } from "vitest";
import { planGarminSync } from "../garmin-sync";

describe("planGarminSync", () => {
  const today = "2026-08-10";

  it("skips activities that already exist", () => {
    const plan = planGarminSync({
      activities: [
        {
          garminActivityId: "1001",
          typeKey: "running",
          date: today,
          durationMinutes: 45,
          calories: 400,
          steps: 5000,
          distanceMeters: 8000,
        },
      ],
      sleep: [],
      dailyMetrics: [],
      existingGarminActivityIds: new Set(["1001"]),
      scheduledSessions: [],
      today,
    });
    expect(plan.activityInserts).toHaveLength(0);
  });

  it("plans inserts for new activities with mapped type names", () => {
    const plan = planGarminSync({
      activities: [
        {
          garminActivityId: "1002",
          typeKey: "trail_running",
          date: "2026-08-09",
          durationMinutes: 60,
          calories: 500,
          steps: 7000,
          distanceMeters: 10000,
        },
      ],
      sleep: [],
      dailyMetrics: [],
      existingGarminActivityIds: new Set(),
      scheduledSessions: [],
      today,
    });
    expect(plan.activityInserts).toEqual([
      expect.objectContaining({
        garminActivityId: "1002",
        activityTypeName: "Running",
        metrics: { distance_km: 10 },
      }),
    ]);
  });

  it("upserts all sleep and daily metric rows", () => {
    const plan = planGarminSync({
      activities: [],
      sleep: [
        {
          date: "2026-08-09",
          score: 78,
          durationMinutes: 420,
          deepSleepMinutes: 90,
          remSleepMinutes: 100,
          lightSleepMinutes: 230,
        },
      ],
      dailyMetrics: [
        { date: "2026-08-09", caloriesTotal: 2400, caloriesActive: 800, steps: 9000 },
      ],
      existingGarminActivityIds: new Set(),
      scheduledSessions: [],
      today,
    });
    expect(plan.sleepUpserts).toHaveLength(1);
    expect(plan.dailyMetricUpserts).toHaveLength(1);
  });

  it("auto-completes today's scheduled session when sport and date match", () => {
    const plan = planGarminSync({
      activities: [
        {
          garminActivityId: "2001",
          typeKey: "tennis",
          date: today,
          durationMinutes: 90,
          calories: 600,
          steps: null,
          distanceMeters: null,
        },
      ],
      sleep: [],
      dailyMetrics: [],
      existingGarminActivityIds: new Set(),
      scheduledSessions: [
        {
          activityId: 42,
          activityTypeName: "Tennis",
          activityDate: today,
          isCompleted: false,
        },
        {
          activityId: 43,
          activityTypeName: "Running",
          activityDate: today,
          isCompleted: false,
        },
      ],
      today,
    });
    expect(plan.sessionsToComplete).toEqual([42]);
  });

  it("does not auto-complete already completed sessions", () => {
    const plan = planGarminSync({
      activities: [
        {
          garminActivityId: "3001",
          typeKey: "running",
          date: today,
          durationMinutes: 30,
          calories: 300,
          steps: 4000,
          distanceMeters: 5000,
        },
      ],
      sleep: [],
      dailyMetrics: [],
      existingGarminActivityIds: new Set(),
      scheduledSessions: [
        {
          activityId: 99,
          activityTypeName: "Running",
          activityDate: today,
          isCompleted: true,
        },
      ],
      today,
    });
    expect(plan.sessionsToComplete).toEqual([]);
  });
});
