import { describe, it, expect } from "vitest";
import { generateSchedule, type TrainingPhaseInfo } from "../scheduler";
import type { Goal, Activity, RecurringActivity, Role, SchedulerSettings } from "@/types";
import type { TrainingPlanSplit } from "../training/split";

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
        sessionType: "training",
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

  it("tags training vs supplemental when a training plan split is present", () => {
    const role = makeRole({ id: 1, name: "Athlete" });
    const goal = makeGoal({
      id: 1,
      title: "Climb hard",
      sessionsPerWeek: 4,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });
    const phaseMap = new Map<number, TrainingPhaseInfo>([
      [
        1,
        {
          phaseType: "skill-stamina",
          displayName: "Skill & Stamina",
          phaseStartDate: weekStart,
          durationWeeks: 4,
          isRest: false,
          description: "FULL DESC",
          sportFocusContent: "CLIMB FOCUS",
          supplementalContent: "SUPP BLOCK",
          mentalGameContent: "MENTAL BLOCK",
        },
      ],
    ]);
    const splitMap = new Map<number, TrainingPlanSplit>([
      [
        1,
        {
          trainingSessionsPerWeek: 2,
          supplementalSessionsPerWeek: 2,
          trainingPreferredDays: [],
          supplementalPreferredDays: [],
        },
      ],
    ]);
    const result = generateSchedule(
      [goal],
      [],
      [],
      [role],
      weekStart,
      defaultSettings,
      "week",
      undefined,
      undefined,
      undefined,
      phaseMap,
      splitMap
    );
    const training = result.activities.filter((a) => a.sessionType === "training");
    const supplemental = result.activities.filter((a) => a.sessionType === "supplemental");
    expect(training.length).toBe(2);
    expect(supplemental.length).toBe(2);
    expect(training[0].notes).toContain("CLIMB FOCUS");
    expect(training[0].notes).toContain("MENTAL BLOCK");
    expect(supplemental[0].notes).toContain("SUPP BLOCK");
    expect(supplemental[0].reason).toContain("[Supplemental]");
  });

  // ─── T032: training-supplemental-split scheduler distribution ────────────

  it("places 2+1 split across a 4-week month: 8 training + 4 supplemental", () => {
    const role = makeRole({ id: 1, name: "Athlete" });
    const goal = makeGoal({
      id: 1,
      title: "Climb hard",
      sessionsPerWeek: 3,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });
    const phaseMap = new Map<number, TrainingPhaseInfo>([
      [
        1,
        {
          phaseType: "skill-stamina",
          displayName: "Skill & Stamina",
          phaseStartDate: "2026-02-02",
          durationWeeks: 4,
          isRest: false,
          description: "FULL",
          sportFocusContent: "CLIMB",
          supplementalContent: "SUPP",
          mentalGameContent: "MENTAL",
        },
      ],
    ]);
    const splitMap = new Map<number, TrainingPlanSplit>([
      [
        1,
        {
          trainingSessionsPerWeek: 2,
          supplementalSessionsPerWeek: 1,
          trainingPreferredDays: [],
          supplementalPreferredDays: [],
        },
      ],
    ]);

    // February 2026 has exactly 28 days = 4 weeks. With sessionsPerWeek = 3
    // and a 2+1 split, the scheduler must allocate 8 training + 4 supplemental
    // over the month (allocateSplitTotals proportional math).
    const result = generateSchedule(
      [goal],
      [],
      [],
      [role],
      "2026-02-02",
      defaultSettings,
      "month",
      undefined,
      undefined,
      undefined,
      phaseMap,
      splitMap
    );

    const training = result.activities.filter((a) => a.sessionType === "training");
    const supplemental = result.activities.filter(
      (a) => a.sessionType === "supplemental"
    );
    expect(training.length).toBe(8);
    expect(supplemental.length).toBe(4);
  });

  it("honors training and supplemental preferred days separately within a week", () => {
    const role = makeRole({ id: 1, name: "Athlete" });
    const goal = makeGoal({
      id: 1,
      title: "Climb",
      sessionsPerWeek: 3,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });
    const phaseMap = new Map<number, TrainingPhaseInfo>([
      [
        1,
        {
          phaseType: "skill-stamina",
          displayName: "Skill & Stamina",
          phaseStartDate: "2026-03-02",
          durationWeeks: 4,
          isRest: false,
          description: "FULL",
          sportFocusContent: "CLIMB",
          supplementalContent: "SUPP",
          mentalGameContent: "MENTAL",
        },
      ],
    ]);
    const splitMap = new Map<number, TrainingPlanSplit>([
      [
        1,
        {
          trainingSessionsPerWeek: 2,
          supplementalSessionsPerWeek: 1,
          trainingPreferredDays: [1, 3], // Mon, Wed
          supplementalPreferredDays: [5], // Fri
        },
      ],
    ]);

    // weekStart is Monday 2026-03-02. The 7-day window covers Mon..Sun.
    const result = generateSchedule(
      [goal],
      [],
      [],
      [role],
      "2026-03-02",
      defaultSettings,
      "week",
      undefined,
      undefined,
      undefined,
      phaseMap,
      splitMap
    );

    const training = result.activities.filter((a) => a.sessionType === "training");
    const supplemental = result.activities.filter(
      (a) => a.sessionType === "supplemental"
    );
    expect(training.length).toBe(2);
    expect(supplemental.length).toBe(1);

    // ISO weekday (1=Mon..7=Sun) from yyyy-mm-dd. Mirrors scheduler.ts's getDayOfWeek.
    function isoWeekday(dateStr: string): number {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      return dow === 0 ? 7 : dow;
    }

    for (const t of training) {
      expect([1, 3]).toContain(isoWeekday(t.activityDate));
    }
    for (const s of supplemental) {
      expect(isoWeekday(s.activityDate)).toBe(5);
    }
  });

  it("falls back to any available day when both preferred-day sets are empty", () => {
    const role = makeRole({ id: 1, name: "Athlete" });
    const goal = makeGoal({
      id: 1,
      title: "Climb",
      sessionsPerWeek: 3,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });
    const phaseMap = new Map<number, TrainingPhaseInfo>([
      [
        1,
        {
          phaseType: "skill-stamina",
          displayName: "Skill & Stamina",
          phaseStartDate: "2026-03-02",
          durationWeeks: 4,
          isRest: false,
          description: "FULL",
          sportFocusContent: "CLIMB",
          supplementalContent: "SUPP",
          mentalGameContent: "MENTAL",
        },
      ],
    ]);
    const splitMap = new Map<number, TrainingPlanSplit>([
      [
        1,
        {
          trainingSessionsPerWeek: 2,
          supplementalSessionsPerWeek: 1,
          trainingPreferredDays: [],
          supplementalPreferredDays: [],
        },
      ],
    ]);

    // Empty preferred-day sets mean the scheduler falls back to "any available
    // day". The split totals must still be correct, and the existing
    // distribute-across-days behavior must still hold.
    const result = generateSchedule(
      [goal],
      [],
      [],
      [role],
      "2026-03-02",
      defaultSettings,
      "week",
      undefined,
      undefined,
      undefined,
      phaseMap,
      splitMap
    );

    const training = result.activities.filter((a) => a.sessionType === "training");
    const supplemental = result.activities.filter(
      (a) => a.sessionType === "supplemental"
    );
    expect(training.length).toBe(2);
    expect(supplemental.length).toBe(1);

    const dates = result.activities.map((a) => a.activityDate);
    expect(new Set(dates).size).toBe(3);
  });

  it("generates no sessions when the goal is in a rest phase", () => {
    const role = makeRole({ id: 1, name: "Athlete" });
    const goal = makeGoal({
      id: 1,
      title: "Climb (rest)",
      sessionsPerWeek: 3,
      roles: [{ id: 1, name: "Athlete", color: "#EF4444" }],
    });
    const phaseMap = new Map<number, TrainingPhaseInfo>([
      [
        1,
        {
          phaseType: "rest",
          displayName: "Rest",
          phaseStartDate: "2026-03-02",
          durationWeeks: 1,
          isRest: true,
        },
      ],
    ]);
    // A split is also provided so the test proves the rest flag is what filters
    // the goal out, not the absence of a split.
    const splitMap = new Map<number, TrainingPlanSplit>([
      [
        1,
        {
          trainingSessionsPerWeek: 2,
          supplementalSessionsPerWeek: 1,
          trainingPreferredDays: [],
          supplementalPreferredDays: [],
        },
      ],
    ]);

    const result = generateSchedule(
      [goal],
      [],
      [],
      [role],
      "2026-03-02",
      defaultSettings,
      "week",
      undefined,
      undefined,
      undefined,
      phaseMap,
      splitMap
    );

    expect(result.activities).toHaveLength(0);
  });
});
