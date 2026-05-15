import type {
  Goal,
  Activity,
  RecurringActivity,
  Role,
  Quadrant,
  SchedulerSettings,
  SessionType,
} from "@/types";
import type { TrainingPlanSplit } from "@/lib/training/split";
import { allocateSplitTotals, weeklySessionTargets } from "@/lib/training/split";

export interface ProposedActivity {
  title: string;
  quadrant: Quadrant;
  activityDate: string;
  startTime: string;
  endTime: string;
  roleId: number | null;
  goalId: number | null;
  activityTypeId: number | null;
  roleName?: string;
  roleColor?: string;
  reason: string;
  notes?: string;
  sessionType: SessionType;
}

export interface ScheduleProposal {
  activities: ProposedActivity[];
  warnings: string[];
  summary: string;
}

export interface MonthlyOverride {
  sessionsPerWeek: number;
  benchmarkLabel?: string;
}

export interface SessionPattern {
  position: number;
  label: string;
  restDaysAfter: number;
}

export interface TrainingPhaseInfo {
  phaseType: string;
  displayName: string;
  phaseStartDate: string;
  durationWeeks: number;
  isRest: boolean;
  description?: string;
  sportFocusContent?: string | null;
  supplementalContent?: string | null;
  mentalGameContent?: string | null;
  limitationNotes?: string | null;
}

const GOAL_DURATION_MINUTES = 60;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const a0 = timeToMinutes(aStart);
  const a1 = timeToMinutes(aEnd);
  const b0 = timeToMinutes(bStart);
  const b1 = timeToMinutes(bEnd);
  return a0 < b1 && b0 < a1;
}

function parseDateParts(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("-").map(Number);
  return [y, m, d];
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDateRange(startDate: string, days: number): string[] {
  const [y, m, d] = parseDateParts(startDate);
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(y, m - 1, d + i);
    dates.push(formatDate(date));
  }
  return dates;
}

function getMonthDates(weekStartDate: string): string[] {
  const [y, m] = parseDateParts(weekStartDate);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const totalDays = lastDay.getDate() - firstDay.getDate() + 1;
  const dates: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(y, m - 1, firstDay.getDate() + i);
    dates.push(formatDate(date));
  }
  return dates;
}

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = parseDateParts(dateStr);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 ? 7 : day; // 1=Mon ... 7=Sun
}

interface TimeWindow {
  start: number;
  end: number;
}

interface DayClassification {
  date: string;
  isWorkDay: boolean;
  isWeekend: boolean;
  workWindows: TimeWindow[];
  personalWindows: TimeWindow[];
  anyWindows: TimeWindow[];
}

function classifyDays(
  dates: string[],
  settings: SchedulerSettings
): DayClassification[] {
  const workStart = timeToMinutes(settings.workStartTime);
  const workEnd = timeToMinutes(settings.workEndTime);
  const earlyMorningStart = 6 * 60;
  const eveningEnd = 22 * 60;

  return dates.map((date) => {
    const dow = getDayOfWeek(date);
    const isWorkDay = settings.workDays.includes(dow);
    const isWeekend = !isWorkDay;

    if (isWeekend) {
      return {
        date,
        isWorkDay: false,
        isWeekend: true,
        workWindows: [],
        personalWindows: [],
        anyWindows: [{ start: earlyMorningStart, end: eveningEnd }],
      };
    }

    return {
      date,
      isWorkDay: true,
      isWeekend: false,
      workWindows: [{ start: workStart, end: workEnd }],
      personalWindows: [
        { start: earlyMorningStart, end: workStart - 30 },
        { start: workEnd + 30, end: eveningEnd },
      ].filter((w) => w.end > w.start),
      anyWindows: [{ start: earlyMorningStart, end: eveningEnd }],
    };
  });
}

function buildOccupiedSlots(
  existingActivities: Activity[],
  recurringActivities: RecurringActivity[],
  dates: string[]
): Map<string, { start: string; end: string }[]> {
  const occupied = new Map<string, { start: string; end: string }[]>();
  for (const date of dates) {
    occupied.set(date, []);
  }

  for (const act of existingActivities) {
    const slots = occupied.get(act.activityDate);
    if (slots) {
      slots.push({ start: act.startTime, end: act.endTime });
    }
  }

  for (const rec of recurringActivities) {
    if (rec.isPaused) continue;
    for (const date of dates) {
      if (getDayOfWeek(date) === rec.dayOfWeek) {
        const slots = occupied.get(date);
        if (slots) {
          slots.push({ start: rec.startTime, end: rec.endTime });
        }
      }
    }
  }

  return occupied;
}

function findSlotInWindows(
  date: string,
  windows: TimeWindow[],
  duration: number,
  occupied: Map<string, { start: string; end: string }[]>
): { start: string; end: string } | null {
  const daySlots = occupied.get(date) ?? [];

  for (const window of windows) {
    for (let startMin = window.start; startMin + duration <= window.end; startMin += 30) {
      const startTime = minutesToTime(startMin);
      const endTime = minutesToTime(startMin + duration);
      const hasConflict = daySlots.some((s) =>
        slotsOverlap(startTime, endTime, s.start, s.end)
      );
      if (!hasConflict) {
        return { start: startTime, end: endTime };
      }
    }
  }

  return null;
}

function getGoalRoleIds(goal: Goal): number[] {
  return goal.roles.map((r) => r.id);
}

function getWeekKey(dateStr: string): string {
  const [y, m, d] = parseDateParts(dateStr);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(y, m - 1, d + mondayOffset);
  return formatDate(monday);
}

function markOccupied(
  occupied: Map<string, { start: string; end: string }[]>,
  date: string,
  start: string,
  end: string
) {
  const slots = occupied.get(date);
  if (slots) {
    slots.push({ start, end });
  }
}

/**
 * Partition dates into ISO weeks (Mon-Sun groups).
 */
function partitionIntoWeeks(dates: string[]): string[][] {
  const weekMap = new Map<string, string[]>();
  for (const d of dates) {
    const wk = getWeekKey(d);
    const arr = weekMap.get(wk) ?? [];
    arr.push(d);
    weekMap.set(wk, arr);
  }
  const weekKeys = [...weekMap.keys()].sort();
  return weekKeys.map((k) => weekMap.get(k)!);
}

/**
 * Shuffle-like tiebreaker: add small random jitter to equal scores
 * so the algorithm doesn't always pick the first day in the array.
 */
function shuffledSort<T>(items: T[], scoreFn: (item: T) => number): T[] {
  return [...items]
    .map((item) => ({ item, score: scoreFn(item), jitter: Math.random() }))
    .sort((a, b) => a.score - b.score || a.jitter - b.jitter)
    .map((x) => x.item);
}

/**
 * Count how many activities are on a given date (occupied slots + proposed).
 */
function countActivitiesOnDate(
  date: string,
  occupied: Map<string, { start: string; end: string }[]>
): number {
  return (occupied.get(date) ?? []).length;
}

interface GoalSlot {
  goal: Goal;
  sessionsPerWeek: number;
  totalSessionsNeeded: number;
  sessionsPlaced: number;
  usedDays: Set<string>;
  isWorkGoal: boolean;
  primaryRoleId: number | null;
  benchmarkLabel?: string;
  preferredDays?: number[];
  preferredTimeSlot?: string | null;
  sessionPatterns?: SessionPattern[];
  patternIndex: number;
  trainingPhase?: TrainingPhaseInfo;
  /** When set, the scheduler places `trainingTotalNeeded` then `supplementalTotalNeeded` sessions with dual preferred-day logic. */
  planSplit?: TrainingPlanSplit;
  trainingTotalNeeded: number;
  supplementalTotalNeeded: number;
  trainingSessionsPlaced: number;
  supplementalSessionsPlaced: number;
}

export function generateSchedule(
  goals: Goal[],
  existingActivities: Activity[],
  recurringActivities: RecurringActivity[],
  roles: Role[],
  weekStartDate: string,
  settings: SchedulerSettings,
  scope: "week" | "month" = "week",
  monthlyOverrides?: Map<number, MonthlyOverride>,
  blackoutDates?: Set<string>,
  goalSessionPatterns?: Map<number, SessionPattern[]>,
  trainingPhases?: Map<number, TrainingPhaseInfo>,
  trainingPlanSplits?: Map<number, TrainingPlanSplit>
): ScheduleProposal {
  const dates =
    scope === "month"
      ? getMonthDates(weekStartDate)
      : getDateRange(weekStartDate, 7);

  const numWeeks = scope === "month" ? Math.ceil(dates.length / 7) : 1;
  const weeks = partitionIntoWeeks(dates);

  const dayClassifications = classifyDays(dates, settings);
  const dayClassMap = new Map(dayClassifications.map((dc) => [dc.date, dc]));

  const occupied = buildOccupiedSlots(
    existingActivities,
    recurringActivities,
    dates
  );

  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const proposed: ProposedActivity[] = [];
  const warnings: string[] = [];

  const unscheduledGoals = goals.filter((g) => !g.isCompleted);

  if (unscheduledGoals.length === 0) {
    return {
      activities: [],
      warnings: [],
      summary: "All focus goals are already completed.",
    };
  }

  const existingGoalSessions = new Map<number, number>();
  for (const act of existingActivities) {
    if (act.goalId !== null) {
      existingGoalSessions.set(
        act.goalId,
        (existingGoalSessions.get(act.goalId) ?? 0) + 1
      );
    }
  }

  const qOrder: Record<Quadrant, number> = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 };
  const sortedGoals = [...unscheduledGoals].sort((a, b) => {
    if (qOrder[a.quadrant] !== qOrder[b.quadrant]) {
      return qOrder[a.quadrant] - qOrder[b.quadrant];
    }
    if (a.targetDate && b.targetDate)
      return a.targetDate.localeCompare(b.targetDate);
    if (a.targetDate) return -1;
    if (b.targetDate) return 1;
    return 0;
  });

  const goalSlots: GoalSlot[] = sortedGoals
    .map((goal) => {
      const phase = trainingPhases?.get(goal.id);
      const planSplit = trainingPlanSplits?.get(goal.id);
      const useSplit = Boolean(phase && planSplit);

      if (phase?.isRest) {
        return null;
      }

      const override = monthlyOverrides?.get(goal.id);
      const spw = override?.sessionsPerWeek ?? goal.sessionsPerWeek ?? 3;
      const totalSessionsRaw = spw * numWeeks;
      const existing = existingGoalSessions.get(goal.id) ?? 0;
      const sessionsRemaining = Math.max(0, totalSessionsRaw - existing);
      const roleIds = getGoalRoleIds(goal);
      const hasWorkRole = roleIds.some((id) => rolesById.get(id)?.isWorkRole);
      const patterns = goalSessionPatterns?.get(goal.id);

      const g = goal as Goal & { preferredDays?: string | null; preferredTimeSlot?: string | null };
      const prefDays = g.preferredDays
        ? g.preferredDays.split(",").map(Number)
        : undefined;

      let trainingTotalNeeded = 0;
      let supplementalTotalNeeded = 0;
      let totalSessionsNeeded = sessionsRemaining;

      if (useSplit && planSplit) {
        const alloc = allocateSplitTotals(planSplit, numWeeks, sessionsRemaining);
        trainingTotalNeeded = alloc.trainingTotal;
        supplementalTotalNeeded = alloc.supplementalTotal;
        totalSessionsNeeded = trainingTotalNeeded + supplementalTotalNeeded;
      }

      return {
        goal,
        sessionsPerWeek: spw,
        totalSessionsNeeded,
        sessionsPlaced: 0,
        usedDays: new Set<string>(),
        isWorkGoal: hasWorkRole,
        primaryRoleId: roleIds[0] ?? null,
        benchmarkLabel: override?.benchmarkLabel,
        preferredDays: prefDays,
        preferredTimeSlot: g.preferredTimeSlot,
        sessionPatterns: patterns,
        patternIndex: 0,
        trainingPhase: phase,
        planSplit: useSplit ? planSplit : undefined,
        trainingTotalNeeded,
        supplementalTotalNeeded,
        trainingSessionsPlaced: 0,
        supplementalSessionsPlaced: 0,
      };
    })
    .filter((gs) => gs !== null && gs.totalSessionsNeeded > 0) as GoalSlot[];

  const roleDaySessions = new Map<number, Set<string>>();
  for (const role of roles) {
    roleDaySessions.set(role.id, new Set());
  }
  for (const act of existingActivities) {
    if (act.roleId !== null) {
      const set = roleDaySessions.get(act.roleId);
      if (set) set.add(act.activityDate);
    }
  }
  for (const rec of recurringActivities) {
    if (rec.isPaused || rec.roleId === null) continue;
    for (const date of dates) {
      if (getDayOfWeek(date) === rec.dayOfWeek) {
        const set = roleDaySessions.get(rec.roleId);
        if (set) set.add(date);
      }
    }
  }

  const blackouts = blackoutDates ?? new Set<string>();

  if (settings.enforceWeeklySpread) {
    placeWeekByWeek(
      weeks,
      goalSlots,
      dayClassMap,
      occupied,
      rolesById,
      roleDaySessions,
      blackouts,
      settings,
      proposed
    );
  } else {
    placeFlat(
      dates,
      goalSlots,
      dayClassMap,
      occupied,
      rolesById,
      roleDaySessions,
      blackouts,
      settings,
      proposed
    );
  }

  for (const gs of goalSlots) {
    if (gs.sessionsPlaced < gs.totalSessionsNeeded) {
      warnings.push(
        `Could only fit ${gs.sessionsPlaced}/${gs.totalSessionsNeeded} sessions for "${gs.goal.title}"`
      );
    }
  }

  const rolesUsed = new Set(proposed.map((p) => p.roleId).filter(Boolean));
  const neglectedRoles = roles.filter(
    (r) => !r.isArchived && !rolesUsed.has(r.id)
  );
  if (neglectedRoles.length > 0 && proposed.length > 0) {
    warnings.push(
      `These roles have no activities scheduled: ${neglectedRoles.map((r) => r.name).join(", ")}`
    );
  }

  const q2Count = proposed.filter((p) => p.quadrant === "Q2").length;
  const totalCount = proposed.length;
  const q2Pct = totalCount > 0 ? Math.round((q2Count / totalCount) * 100) : 0;
  const daysUsed = new Set(proposed.map((p) => p.activityDate)).size;

  const scopeLabel = scope === "month" ? "month" : "week";
  const summary = [
    `Generated ${proposed.length} activities across ${unscheduledGoals.length} goals for the ${scopeLabel}.`,
    `Q2 focus: ${q2Pct}%.`,
    proposed.length > 0 ? `Spread across ${daysUsed} days.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { activities: proposed, warnings, summary };
}

/**
 * Week-by-week placement: for each week, place up to sessionsPerWeek
 * sessions per goal. This ensures even distribution across weeks.
 */
function placeWeekByWeek(
  weeks: string[][],
  goalSlots: GoalSlot[],
  dayClassMap: Map<string, DayClassification>,
  occupied: Map<string, { start: string; end: string }[]>,
  rolesById: Map<number, Role>,
  roleDaySessions: Map<number, Set<string>>,
  blackouts: Set<string>,
  settings: SchedulerSettings,
  proposed: ProposedActivity[]
) {
  for (const weekDates of weeks) {
    const availableDates = weekDates.filter((d) => !blackouts.has(d));
    if (availableDates.length === 0) continue;

    for (const gs of goalSlots) {
      if (gs.sessionsPlaced >= gs.totalSessionsNeeded) continue;

      if (gs.planSplit) {
        const weekKey =
          availableDates.length > 0 ? getWeekKey(availableDates[0]) : "";
        const targets = weeklySessionTargets(gs.planSplit, weekKey);
        let trainWeek = 0;
        while (
          trainWeek < targets.trainingCount &&
          gs.trainingSessionsPlaced < gs.trainingTotalNeeded &&
          gs.sessionsPlaced < gs.totalSessionsNeeded
        ) {
          const placed = tryPlaceSession(
            gs,
            availableDates,
            dayClassMap,
            occupied,
            rolesById,
            roleDaySessions,
            settings,
            proposed,
            "training"
          );
          if (!placed) break;
          trainWeek++;
        }
        let supWeek = 0;
        while (
          supWeek < targets.supplementalCount &&
          gs.supplementalSessionsPlaced < gs.supplementalTotalNeeded &&
          gs.sessionsPlaced < gs.totalSessionsNeeded
        ) {
          const placed = tryPlaceSession(
            gs,
            availableDates,
            dayClassMap,
            occupied,
            rolesById,
            roleDaySessions,
            settings,
            proposed,
            "supplemental"
          );
          if (!placed) break;
          supWeek++;
        }
      } else {
        const weekCap = gs.sessionsPerWeek;
        let placedThisWeek = 0;

        while (placedThisWeek < weekCap && gs.sessionsPlaced < gs.totalSessionsNeeded) {
          const placed = tryPlaceSession(
            gs,
            availableDates,
            dayClassMap,
            occupied,
            rolesById,
            roleDaySessions,
            settings,
            proposed,
            "training"
          );
          if (!placed) break;
          placedThisWeek++;
        }
      }
    }
  }
}

/**
 * Flat placement (legacy behavior without weekly spread).
 * Round-robin across all dates at once.
 */
function placeFlat(
  dates: string[],
  goalSlots: GoalSlot[],
  dayClassMap: Map<string, DayClassification>,
  occupied: Map<string, { start: string; end: string }[]>,
  rolesById: Map<number, Role>,
  roleDaySessions: Map<number, Set<string>>,
  blackouts: Set<string>,
  settings: SchedulerSettings,
  proposed: ProposedActivity[]
) {
  const availableDates = dates.filter((d) => !blackouts.has(d));
  let madeProgress = true;

  while (madeProgress) {
    madeProgress = false;
    for (const gs of goalSlots) {
      if (gs.sessionsPlaced >= gs.totalSessionsNeeded) continue;

      if (gs.planSplit) {
        const typeToPlace: SessionType | null =
          gs.trainingSessionsPlaced < gs.trainingTotalNeeded
            ? "training"
            : gs.supplementalSessionsPlaced < gs.supplementalTotalNeeded
              ? "supplemental"
              : null;
        if (!typeToPlace) continue;
        const placed = tryPlaceSession(
          gs,
          availableDates,
          dayClassMap,
          occupied,
          rolesById,
          roleDaySessions,
          settings,
          proposed,
          typeToPlace
        );
        if (placed) madeProgress = true;
      } else {
        const placed = tryPlaceSession(
          gs,
          availableDates,
          dayClassMap,
          occupied,
          rolesById,
          roleDaySessions,
          settings,
          proposed,
          "training"
        );
        if (placed) madeProgress = true;
      }
    }
  }
}

/** Preferred weekdays (1–7 Mon–Sun) for scoring: off-preference days get +10. */
function preferredDayPenalty(dow: number, pref: number[] | undefined): number {
  if (!pref || pref.length === 0) return 0;
  return pref.includes(dow) ? 0 : 10;
}

function getPreferredDaysForSession(
  gs: GoalSlot,
  sessionType: SessionType
): number[] | undefined {
  if (!gs.planSplit) return gs.preferredDays;
  if (sessionType === "training") {
    const d = gs.planSplit.trainingPreferredDays;
    return d.length > 0 ? d : undefined;
  }
  const d = gs.planSplit.supplementalPreferredDays;
  return d.length > 0 ? d : undefined;
}

/** Extra penalty when supplemental lands on a day listed in both preference arrays (training has priority). */
function supplementalSharedPreferencePenalty(
  dow: number,
  split: TrainingPlanSplit,
  sessionType: SessionType
): number {
  if (sessionType !== "supplemental") return 0;
  if (
    split.trainingPreferredDays.includes(dow) &&
    split.supplementalPreferredDays.includes(dow)
  ) {
    return 18;
  }
  return 0;
}

/** Try to place one session of the given type. */
function tryPlaceSession(
  gs: GoalSlot,
  availableDates: string[],
  dayClassMap: Map<string, DayClassification>,
  occupied: Map<string, { start: string; end: string }[]>,
  rolesById: Map<number, Role>,
  roleDaySessions: Map<number, Set<string>>,
  settings: SchedulerSettings,
  proposed: ProposedActivity[],
  sessionType: SessionType
): boolean {
  const primaryRole = gs.goal.roles[0];
  const roleIds = getGoalRoleIds(gs.goal);

  const candidateDays = availableDates
    .filter((d) => !gs.usedDays.has(d))
    .map((d) => dayClassMap.get(d)!)
    .filter(Boolean);

  if (candidateDays.length === 0) return false;

  const prefForScore = getPreferredDaysForSession(gs, sessionType);

  const scoredDays = shuffledSort(candidateDays, (dc) => {
    let score = countActivitiesOnDate(dc.date, occupied);

    if (score >= settings.maxActivitiesPerDay) {
      score += 1000;
    }

    const dow = getDayOfWeek(dc.date);
    score += preferredDayPenalty(dow, prefForScore);

    if (gs.planSplit) {
      score += supplementalSharedPreferencePenalty(
        dow,
        gs.planSplit,
        sessionType
      );
    }

    return score;
  });

  // Check pattern-based rest if applicable
  const currentPattern = gs.sessionPatterns && gs.sessionPatterns.length > 0
    ? gs.sessionPatterns[gs.patternIndex % gs.sessionPatterns.length]
    : null;

  for (const dc of scoredDays) {
    if (countActivitiesOnDate(dc.date, occupied) >= settings.maxActivitiesPerDay) {
      continue;
    }

    if (currentPattern && violatesPatternRest(dc.date, gs, currentPattern)) continue;

    let windows = getWindows(dc, gs);

    if (gs.preferredTimeSlot) {
      const prefWindows = getPreferredTimeWindows(gs.preferredTimeSlot);
      if (prefWindows) {
        const slot = findSlotInWindows(dc.date, prefWindows, GOAL_DURATION_MINUTES, occupied);
        if (slot) {
          commitSession(
            gs,
            dc,
            slot,
            primaryRole,
            roleIds,
            currentPattern,
            occupied,
            roleDaySessions,
            proposed,
            sessionType
          );
          return true;
        }
      }
    }

    const slot = findSlotInWindows(dc.date, windows, GOAL_DURATION_MINUTES, occupied);
    if (slot) {
      commitSession(
        gs,
        dc,
        slot,
        primaryRole,
        roleIds,
        currentPattern,
        occupied,
        roleDaySessions,
        proposed,
        sessionType
      );
      return true;
    }
  }

  // Fallback: try anyWindows on all candidates (still respects rest constraints)
  for (const dc of scoredDays) {
    if (countActivitiesOnDate(dc.date, occupied) >= settings.maxActivitiesPerDay) continue;
    if (gs.usedDays.has(dc.date)) continue;

    if (currentPattern && violatesPatternRest(dc.date, gs, currentPattern)) continue;

    const slot = findSlotInWindows(
      dc.date,
      dc.anyWindows.length > 0 ? dc.anyWindows : [{ start: 6 * 60, end: 22 * 60 }],
      GOAL_DURATION_MINUTES,
      occupied
    );

    if (slot) {
      commitSession(
        gs,
        dc,
        slot,
        primaryRole,
        roleIds,
        currentPattern,
        occupied,
        roleDaySessions,
        proposed,
        sessionType
      );
      return true;
    }
  }

  return false;
}

function getWindows(dc: DayClassification, gs: GoalSlot): TimeWindow[] {
  if (dc.isWeekend) return dc.anyWindows;
  if (gs.isWorkGoal) return dc.workWindows;
  return dc.personalWindows;
}

function getPreferredTimeWindows(slot: string): TimeWindow[] | null {
  switch (slot) {
    case "morning": return [{ start: 6 * 60, end: 12 * 60 }];
    case "afternoon": return [{ start: 12 * 60, end: 17 * 60 }];
    case "evening": return [{ start: 17 * 60, end: 22 * 60 }];
    default: return null;
  }
}

function commitSession(
  gs: GoalSlot,
  dc: DayClassification,
  slot: { start: string; end: string },
  primaryRole: { id: number; name: string; color: string } | undefined,
  roleIds: number[],
  pattern: SessionPattern | null,
  occupied: Map<string, { start: string; end: string }[]>,
  roleDaySessions: Map<number, Set<string>>,
  proposed: ProposedActivity[],
  sessionType: SessionType
) {
  gs.sessionsPlaced++;
  if (gs.planSplit) {
    if (sessionType === "training") gs.trainingSessionsPlaced++;
    else gs.supplementalSessionsPlaced++;
  }

  let title: string;
  if (gs.trainingPhase) {
    const weekNum = getPhaseWeekNumber(dc.date, gs.trainingPhase);
    const weekLabel = `Week ${weekNum}/${gs.trainingPhase.durationWeeks}`;
    title = `${gs.goal.title} — ${gs.trainingPhase.displayName} (${weekLabel})`;
  } else if (pattern) {
    title = `${gs.goal.title} — ${pattern.label}`;
  } else {
    title = gs.goal.title;
  }

  const reason = buildReason(gs, dc, pattern, sessionType);

  let notes: string | undefined;
  if (gs.trainingPhase) {
    if (sessionType === "training") {
      if (gs.trainingPhase.sportFocusContent) {
        notes = gs.trainingPhase.sportFocusContent;
        if (gs.trainingPhase.mentalGameContent) {
          notes += `\n\n${gs.trainingPhase.mentalGameContent}`;
        }
      }
    } else if (gs.trainingPhase.supplementalContent) {
      notes = gs.trainingPhase.supplementalContent;
    }
    if (!notes && gs.trainingPhase.description) {
      notes = gs.trainingPhase.description;
    }
    if (notes && gs.trainingPhase.limitationNotes) {
      notes += `\n\n[PHYSICAL LIMITATIONS]\n${gs.trainingPhase.limitationNotes}`;
    }
  } else if (gs.goal.description) {
    notes = gs.goal.description;
  }

  proposed.push({
    title,
    quadrant: gs.goal.quadrant,
    activityDate: dc.date,
    startTime: slot.start,
    endTime: slot.end,
    roleId: primaryRole?.id ?? null,
    goalId: gs.goal.id,
    activityTypeId: gs.goal.activityTypeId ?? null,
    roleName: primaryRole?.name,
    roleColor: primaryRole?.color,
    reason,
    notes,
    sessionType,
  });

  markOccupied(occupied, dc.date, slot.start, slot.end);
  gs.usedDays.add(dc.date);

  for (const rid of roleIds) {
    const set = roleDaySessions.get(rid);
    if (set) set.add(dc.date);
  }

  if (pattern) {
    gs.patternIndex++;
  }
}

function buildReason(
  gs: GoalSlot,
  dc: DayClassification,
  pattern: SessionPattern | null,
  sessionType: SessionType
): string {
  const sessionLabel = `Session ${gs.sessionsPlaced}/${gs.totalSessionsNeeded}`;
  const parts = [sessionLabel];

  if (gs.trainingPhase) parts.push(`[${gs.trainingPhase.displayName} phase]`);
  if (sessionType === "supplemental" && gs.trainingPhase) parts.push("[Supplemental]");
  if (gs.benchmarkLabel) parts.push(`(${gs.benchmarkLabel})`);
  if (pattern) parts.push(`[${pattern.label}]`);

  const timeContext = gs.isWorkGoal
    ? "work hours"
    : dc.isWeekend
      ? "weekend"
      : "personal time";
  parts.push(`— ${timeContext}`);

  return parts.join(" ");
}

function getPhaseWeekNumber(dateStr: string, phase: TrainingPhaseInfo): number {
  const [ay, am, ad] = parseDateParts(dateStr);
  const [py, pm, pd] = parseDateParts(phase.phaseStartDate);
  const actDate = new Date(ay, am - 1, ad);
  const phaseStart = new Date(py, pm - 1, pd);
  const diffMs = actDate.getTime() - phaseStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, phase.durationWeeks));
}

/**
 * Check if placing a session on this date violates the pattern-based rest
 * requirement. Uses the LAST placed session's pattern restDaysAfter.
 */
function violatesPatternRest(
  date: string,
  gs: GoalSlot,
  _currentPattern: SessionPattern
): boolean {
  if (gs.usedDays.size === 0) return false;

  const prevPatternIdx = (gs.patternIndex - 1 + (gs.sessionPatterns?.length ?? 1)) % (gs.sessionPatterns?.length ?? 1);
  const prevPattern = gs.sessionPatterns?.[prevPatternIdx];
  const requiredRest = prevPattern?.restDaysAfter ?? 1;

  const [y, m, d] = parseDateParts(date);
  for (let offset = 1; offset <= requiredRest; offset++) {
    const nearDate = formatDate(new Date(y, m - 1, d - offset));
    if (gs.usedDays.has(nearDate)) return true;
  }

  return false;
}
