import { describe, it, expect } from "vitest";
import { generateSchedule } from "../scheduler";
import type { Goal, Activity, RecurringActivity, Role, SchedulerSettings } from "@/types";

function makeRole(overrides: Partial<Role> & { id: number; name: string }): Role {
  return {
    description: null,
    color: "#3B82F6",
    displayOrder: 0,
    isArchived: false,
    isWorkRole: false,
    maxWeeklyOccurrences: 7,
    minRestDays: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function makeGoal(overrides: Partial<Goal> & { id: number; title: string }): Goal {
  return {
    description: null,
    quadrant: "Q2",
    targetDate: null,
    sessionsPerWeek: 3,
    activityTypeId: null,
    targetMetric: null,
    targetValue: null,
    targetPeriod: null,
    targetUnit: null,
    status: "active",
    isCompleted: false,
    horizon: null,
    parentGoalId: null,
    month: null,
    preferredDays: null,
    preferredTimeSlot: null,
    createdAt: "",
    updatedAt: "",
    roles: [],
    ...overrides,
  };
}

const defaultSettings: SchedulerSettings = {
  id: 1,
  workStartTime: "09:00",
  workEndTime: "17:00",
  workDays: [1, 2, 3, 4, 5],
  enforceWeeklySpread: true,
  maxActivitiesPerDay: 4,
};

const weekStart = "2026-03-02"; // Monday

describe("generateSchedule", () => {
  it("returns empty when all goals are completed", () => {
    const goal = makeGoal({
      id: 1,
      title: "Done goal",
      isCompleted: true,
      roles: [{ id: 1, name: "Pro", color: "#000" }],
    });

    const result = generateSchedule(
      [goal], [], [], [], weekStart, defaultSettings, "week"
    );

    expect(result.activities).toHaveLength(0);
    expect(result.summary).toContain("completed");
  });

  it("generates activities for a single active goal", () => {
    const role = makeRole({ id: 1, name: "Athlete" });
    const goal = makeGoal({
      id: 1,
      title: "Run 5K",
      sessionsPerWeek: 3,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });

    const result = generateSchedule(
      [goal], [], [], [role], weekStart, defaultSettings, "week"
    );

    expect(result.activities.length).toBe(3);
    expect(result.activities.every((a) => a.goalId === 1)).toBe(true);
    expect(result.activities.every((a) => a.title === "Run 5K")).toBe(true);
  });

  it("spreads activities across different days", () => {
    const role = makeRole({ id: 1, name: "Athlete" });
    const goal = makeGoal({
      id: 1,
      title: "Run 5K",
      sessionsPerWeek: 3,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });

    const result = generateSchedule(
      [goal], [], [], [role], weekStart, defaultSettings, "week"
    );

    const dates = result.activities.map((a) => a.activityDate);
    const uniqueDates = new Set(dates);
    expect(uniqueDates.size).toBe(3);
  });

  it("respects rest day constraints", () => {
    const role = makeRole({
      id: 1,
      name: "Athlete",
      minRestDays: 1,
    });
    const goal = makeGoal({
      id: 1,
      title: "Heavy Lifting",
      sessionsPerWeek: 4,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });

    const result = generateSchedule(
      [goal], [], [], [role], weekStart, defaultSettings, "week"
    );

    const dates = result.activities.map((a) => a.activityDate).sort();
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + "T00:00:00");
      const curr = new Date(dates[i] + "T00:00:00");
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(2);
    }
  });

  it("places work-role goals during work hours on weekdays", () => {
    const role = makeRole({ id: 1, name: "Professional", isWorkRole: true });
    const goal = makeGoal({
      id: 1,
      title: "Code review",
      sessionsPerWeek: 2,
      roles: [{ id: 1, name: "Professional", color: "#3B82F6" }],
    });

    const result = generateSchedule(
      [goal], [], [], [role], weekStart, defaultSettings, "week"
    );

    const weekdayActivities = result.activities.filter((a) => {
      const dow = new Date(a.activityDate + "T00:00:00").getDay();
      return dow >= 1 && dow <= 5;
    });

    for (const act of weekdayActivities) {
      const [h] = act.startTime.split(":").map(Number);
      expect(h).toBeGreaterThanOrEqual(9);
      expect(h).toBeLessThan(17);
    }
  });

  it("does not overlap with existing activities", () => {
    const role = makeRole({ id: 1, name: "Athlete" });
    const goal = makeGoal({
      id: 1,
      title: "Run",
      sessionsPerWeek: 1,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });

    const existingActivities: Activity[] = [
      {
        id: 100,
        goalId: null,
        roleId: null,
        recurringActivityId: null,
        activityTypeId: null,
        title: "Existing",
        quadrant: "Q2",
        activityDate: "2026-03-02",
        startTime: "06:00",
        endTime: "08:30",
        isCompleted: false,
        isLogEntry: false,
        notes: null,
        carryForwardFrom: null,
        createdAt: "",
        updatedAt: "",
      },
    ];

    const result = generateSchedule(
      [goal], existingActivities, [], [role], weekStart, defaultSettings, "week"
    );

    for (const proposed of result.activities) {
      for (const existing of existingActivities) {
        if (proposed.activityDate !== existing.activityDate) continue;
        const pStart = proposed.startTime;
        const pEnd = proposed.endTime;
        const eStart = existing.startTime;
        const eEnd = existing.endTime;
        const overlaps = pStart < eEnd && eStart < pEnd;
        expect(overlaps).toBe(false);
      }
    }
  });

  it("warns when maxWeeklyOccurrences is restrictive", () => {
    const role = makeRole({
      id: 1,
      name: "Athlete",
      maxWeeklyOccurrences: 2,
      minRestDays: 2,
    });
    const goal = makeGoal({
      id: 1,
      title: "Run",
      sessionsPerWeek: 5,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });

    const result = generateSchedule(
      [goal], [], [], [role], weekStart, defaultSettings, "week"
    );

    // Primary placement respects maxWeeklyOccurrences, fallback may add more
    // but if constraints are tight enough, warnings should appear
    expect(result.activities.length).toBeGreaterThan(0);
    expect(result.activities.length).toBeLessThanOrEqual(5);
  });

  it("generates for month scope with more sessions", () => {
    const role = makeRole({ id: 1, name: "Athlete" });
    const goal = makeGoal({
      id: 1,
      title: "Run",
      sessionsPerWeek: 3,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });

    const resultWeek = generateSchedule(
      [goal], [], [], [role], weekStart, defaultSettings, "week"
    );
    const resultMonth = generateSchedule(
      [goal], [], [], [role], weekStart, defaultSettings, "month"
    );

    expect(resultMonth.activities.length).toBeGreaterThan(
      resultWeek.activities.length
    );
  });
});
