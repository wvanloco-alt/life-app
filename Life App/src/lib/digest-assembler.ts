import {
  activities,
  activityLogs,
  activityTypes,
  dailyMetrics,
  emailPreferences,
  goals,
  habitLogs,
  habits,
  libraryBookmarks,
  libraryCategories,
  libraryItems,
  libraryTopics,
  sleepLogs,
  trainingPhases,
  trainingPlans,
  users,
} from "@/db/schema";
import { getDurationMinutes } from "@/lib/dates";
import { getPhaseDisplayName } from "@/lib/training/periodization";
import type { DigestContent } from "@/types";
import { and, asc, desc, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";
import { differenceInCalendarDays, format, parseISO, startOfMonth, subDays } from "date-fns";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "@/db/schema";

type AppDb = BetterSQLite3Database<typeof schema>;

function parseDistanceKm(metrics: string): number {
  try {
    const parsed = JSON.parse(metrics) as { distance_km?: number };
    return typeof parsed.distance_km === "number" && parsed.distance_km > 0
      ? parsed.distance_km
      : 0;
  } catch {
    return 0;
  }
}

function isRunningSport(name: string): boolean {
  return name.toLowerCase().includes("run");
}

function sportLabel(name: string, count: number): string {
  const lower = name.toLowerCase();
  if (isRunningSport(name)) return count === 1 ? "1 run" : `${count} runs`;
  return count === 1 ? `1 ${lower}` : `${count} ${lower}`;
}

async function getUserName(db: AppDb, userId: string): Promise<string> {
  const rows = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.username ?? "there";
}

async function queryTodaySession(
  db: AppDb,
  userId: string,
  date: string
): Promise<DigestContent["todaySession"] | undefined> {
  const sessionRows = await db
    .select({
      activityTypeName: activityTypes.name,
      defaultDurationMinutes: activityTypes.defaultDurationMinutes,
      startTime: activities.startTime,
      endTime: activities.endTime,
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
    .orderBy(asc(activityTypes.name))
    .limit(1);

  const row = sessionRows[0];
  if (!row) return undefined;

  const phaseRows = await db
    .select()
    .from(trainingPhases)
    .where(
      and(eq(trainingPhases.trainingPlanId, row.trainingPlanId), eq(trainingPhases.status, "active"))
    );

  let phase: (typeof phaseRows)[number] | undefined;
  for (const candidate of phaseRows) {
    if (candidate.phaseType === "rest") continue;
    if (!phase || (candidate.updatedAt ?? "") > (phase.updatedAt ?? "")) {
      phase = candidate;
    }
  }
  if (!phase) return undefined;

  let durationMinutes = getDurationMinutes(row.startTime, row.endTime);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    durationMinutes = row.defaultDurationMinutes;
  }

  return {
    sport: row.activityTypeName,
    phaseName: getPhaseDisplayName(phase.phaseType),
    durationMinutes,
  };
}

async function queryHabitCounts(
  db: AppDb,
  userId: string,
  today: string,
  limit: number
): Promise<{ name: string; doneLast30: number }[]> {
  const thirtyDaysAgo = format(subDays(parseISO(today), 29), "yyyy-MM-dd");

  const rows = await db
    .select({
      name: habits.name,
      done: sql<number>`count(${habitLogs.id})`.mapWith(Number),
      displayOrder: habits.displayOrder,
    })
    .from(habits)
    .leftJoin(
      habitLogs,
      and(
        eq(habitLogs.habitId, habits.id),
        gte(habitLogs.date, thirtyDaysAgo),
        lte(habitLogs.date, today)
      )
    )
    .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)))
    .groupBy(habits.id)
    .orderBy(desc(sql`count(${habitLogs.id})`), asc(habits.displayOrder))
    .limit(limit);

  return rows
    .filter((row) => row.done > 0)
    .map((row) => ({ name: row.name, doneLast30: row.done }));
}

function hasDailyBody(content: {
  sleep?: DigestContent["sleep"];
  activity?: DigestContent["activity"];
  calories?: DigestContent["calories"];
  todaySession?: DigestContent["todaySession"];
  habitHighlight?: DigestContent["habitHighlight"];
}): boolean {
  return Boolean(
    content.sleep ||
      content.activity ||
      content.calories ||
      content.todaySession ||
      content.habitHighlight
  );
}

function hasWeeklyBody(content: {
  weekSessions?: DigestContent["weekSessions"];
  weekSleepAvg?: number;
  topHabits?: DigestContent["topHabits"];
  todaySession?: DigestContent["todaySession"];
}): boolean {
  return Boolean(
    (content.weekSessions && content.weekSessions.length > 0) ||
      content.weekSleepAvg != null ||
      (content.topHabits && content.topHabits.length > 0) ||
      content.todaySession
  );
}

async function queryMonthlyStats(
  db: AppDb,
  userId: string,
  today: string
): Promise<DigestContent["monthlyStats"]> {
  const monthStart = format(startOfMonth(parseISO(today)), "yyyy-MM-dd");

  const [actRow] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), gte(activityLogs.date, monthStart)));

  const [habitRow] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(habitLogs)
    .where(and(eq(habitLogs.userId, userId), gte(habitLogs.date, monthStart)));

  const sleepRows = await db
    .select({ score: sleepLogs.score })
    .from(sleepLogs)
    .where(
      and(eq(sleepLogs.userId, userId), gte(sleepLogs.date, monthStart), isNotNull(sleepLogs.score))
    );

  const stepsRows = await db
    .select({ steps: dailyMetrics.steps })
    .from(dailyMetrics)
    .where(
      and(eq(dailyMetrics.userId, userId), gte(dailyMetrics.date, monthStart), isNotNull(dailyMetrics.steps))
    );

  const sleepAvg =
    sleepRows.length > 0
      ? Math.round(sleepRows.reduce((s, r) => s + (r.score ?? 0), 0) / sleepRows.length)
      : undefined;

  const avgSteps =
    stepsRows.length > 0
      ? Math.round(stepsRows.reduce((s, r) => s + (r.steps ?? 0), 0) / stepsRows.length)
      : undefined;

  return {
    activities: actRow?.count ?? 0,
    habitsLogged: habitRow?.count ?? 0,
    sleepAvg,
    avgSteps,
  };
}

async function getExcludedTopics(db: AppDb, userId: string): Promise<string[]> {
  const rows = await db
    .select({ excluded: emailPreferences.excludedLibraryTopics })
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId))
    .limit(1);
  const raw = rows[0]?.excluded;
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

type SegmentRow = { topicTitle: string; itemTitle: string; what: string; how: string };

async function queryLibrarySegment(
  db: AppDb,
  userId: string,
  activityNames: string[],
  hasHabits: boolean,
  habitConsistencyLow: boolean
): Promise<DigestContent["librarySegment"] | undefined> {
  const excludedSlugs = await getExcludedTopics(db, userId);

  // Build candidate topic slugs: yesterday's sports first, then contextual fallbacks
  const candidates: string[] = [];
  for (const name of activityNames) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    if (!excludedSlugs.includes(slug)) candidates.push(slug);
  }
  if ((!hasHabits || habitConsistencyLow) && !excludedSlugs.includes("habit-design")) {
    candidates.push("habit-design");
  }

  // Helper: pick bookmarked item first, then any item, for a given slug
  async function pickFromSlug(slug: string): Promise<SegmentRow | undefined> {
    const baseQuery = db
      .select({
        topicTitle: libraryTopics.title,
        itemTitle: libraryItems.title,
        what: libraryItems.what,
        how: libraryItems.how,
        itemId: libraryItems.id,
      })
      .from(libraryItems)
      .innerJoin(libraryCategories, eq(libraryItems.categoryId, libraryCategories.id))
      .innerJoin(libraryTopics, eq(libraryCategories.topicId, libraryTopics.id))
      .where(eq(libraryTopics.slug, slug));

    const all = await baseQuery;
    if (all.length === 0) return undefined;

    // Prefer bookmarked items
    const bookmarkedIds = new Set(
      (await db
        .select({ itemId: libraryBookmarks.itemId })
        .from(libraryBookmarks)
        .where(eq(libraryBookmarks.userId, userId))
      ).map((r) => r.itemId)
    );

    const bookmarked = all.filter((r) => bookmarkedIds.has(r.itemId));
    const pool = bookmarked.length > 0 ? bookmarked : all;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Try candidates in order
  for (const slug of candidates) {
    const result = await pickFromSlug(slug);
    if (result) return result;
  }

  // Fallback: random from any non-excluded topic
  const all = await db
    .select({
      topicTitle: libraryTopics.title,
      itemTitle: libraryItems.title,
      what: libraryItems.what,
      how: libraryItems.how,
      slug: libraryTopics.slug,
    })
    .from(libraryItems)
    .innerJoin(libraryCategories, eq(libraryItems.categoryId, libraryCategories.id))
    .innerJoin(libraryTopics, eq(libraryCategories.topicId, libraryTopics.id));

  const eligible = all.filter((r) => !excludedSlugs.includes(r.slug));
  if (eligible.length === 0) return undefined;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

export async function buildDailyContent(
  userId: string,
  today: string,
  db: AppDb
): Promise<DigestContent | null> {
  const yesterday = format(subDays(parseISO(today), 1), "yyyy-MM-dd");
  const userName = await getUserName(db, userId);
  const appUrl = process.env.NEXTAUTH_URL ?? "";

  // Sleep
  const sleepRow = await db
    .select({ score: sleepLogs.score, durationMinutes: sleepLogs.durationMinutes })
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, userId), eq(sleepLogs.date, yesterday)))
    .limit(1);

  let sleep: DigestContent["sleep"];
  const sleepData = sleepRow[0];
  if (sleepData?.score != null && sleepData.durationMinutes != null) {
    sleep = { score: sleepData.score, durationMinutes: sleepData.durationMinutes };
  }

  // Activities (always, independent of sleep)
  let activity: DigestContent["activity"];
  const activityRows = await db
    .select({ metrics: activityLogs.metrics, typeName: activityTypes.name, calories: activityLogs.calories })
    .from(activityLogs)
    .innerJoin(activityTypes, eq(activityLogs.activityTypeId, activityTypes.id))
    .where(and(eq(activityLogs.userId, userId), eq(activityLogs.date, yesterday)));

  if (activityRows.length > 0) {
    let kmRun = 0;
    for (const row of activityRows) {
      kmRun += parseDistanceKm(row.metrics);
    }
    const names = [...new Set(activityRows.map((r) => r.typeName))];
    activity = {
      count: activityRows.length,
      names,
      ...(kmRun > 0 ? { kmRun: Math.round(kmRun * 10) / 10 } : {}),
    };
  }

  // Calories from daily_metrics
  let calories: DigestContent["calories"];
  const calorieRow = await db
    .select({ total: dailyMetrics.caloriesTotal, active: dailyMetrics.caloriesActive })
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), eq(dailyMetrics.date, yesterday)))
    .limit(1);
  if (calorieRow[0]?.total != null && calorieRow[0]?.active != null) {
    calories = { total: calorieRow[0].total, active: calorieRow[0].active };
  }

  const todaySession = await queryTodaySession(db, userId, today);
  const habitRows = await queryHabitCounts(db, userId, today, 1);
  const habitHighlight = habitRows[0];

  const monthlyStats = await queryMonthlyStats(db, userId, today);

  const activityNames = activity?.names ?? [];
  const habitConsistencyLow = habitHighlight ? habitHighlight.doneLast30 < 10 : false;
  const librarySegment = await queryLibrarySegment(db, userId, activityNames, !!habitHighlight, habitConsistencyLow);

  const partial = { sleep, activity, calories, todaySession, habitHighlight };
  if (!hasDailyBody(partial)) return null;

  return {
    userName,
    cadence: "daily",
    appUrl,
    monthlyStats,
    librarySegment,
    ...partial,
  };
}

export function getPreviousIsoWeekRange(today: string): { start: string; end: string } {
  const end = subDays(parseISO(today), 1);
  const start = subDays(end, 6);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

export async function buildWeeklyContent(
  userId: string,
  today: string,
  db: AppDb
): Promise<DigestContent | null> {
  const { start, end } = getPreviousIsoWeekRange(today);
  const userName = await getUserName(db, userId);
  const appUrl = process.env.NEXTAUTH_URL ?? "";

  const weekActivityRows = await db
    .select({
      sport: activityTypes.name,
      metrics: activityLogs.metrics,
    })
    .from(activityLogs)
    .innerJoin(activityTypes, eq(activityLogs.activityTypeId, activityTypes.id))
    .where(
      and(
        eq(activityLogs.userId, userId),
        gte(activityLogs.date, start),
        lte(activityLogs.date, end)
      )
    );

  const bySport = new Map<string, { count: number; kmRun: number }>();
  for (const row of weekActivityRows) {
    const existing = bySport.get(row.sport) ?? { count: 0, kmRun: 0 };
    existing.count += 1;
    if (isRunningSport(row.sport)) {
      existing.kmRun += parseDistanceKm(row.metrics);
    }
    bySport.set(row.sport, existing);
  }

  const weekSessions =
    bySport.size > 0
      ? [...bySport.entries()].map(([sport, stats]) => ({
          sport,
          count: stats.count,
          ...(stats.kmRun > 0 ? { kmRun: Math.round(stats.kmRun * 10) / 10 } : {}),
        }))
      : undefined;

  const sleepRows = await db
    .select({ score: sleepLogs.score })
    .from(sleepLogs)
    .where(
      and(
        eq(sleepLogs.userId, userId),
        gte(sleepLogs.date, start),
        lte(sleepLogs.date, end),
        isNotNull(sleepLogs.score)
      )
    );

  let weekSleepAvg: number | undefined;
  if (sleepRows.length > 0) {
    const total = sleepRows.reduce((sum, row) => sum + (row.score ?? 0), 0);
    weekSleepAvg = Math.round(total / sleepRows.length);
  }

  const topHabits = await queryHabitCounts(db, userId, today, 2);
  const todaySession = await queryTodaySession(db, userId, today);

  const partial = { weekSessions, weekSleepAvg, topHabits, todaySession };
  if (!hasWeeklyBody(partial)) return null;

  return {
    userName,
    cadence: "weekly",
    appUrl,
    ...partial,
  };
}

export function formatSleepDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function formatWeekSessionsSummary(
  sessions: NonNullable<DigestContent["weekSessions"]>
): string {
  const total = sessions.reduce((sum, s) => sum + s.count, 0);
  const parts = sessions.map((s) => {
    const label = sportLabel(s.sport, s.count);
    if (s.kmRun != null && s.kmRun > 0) {
      return `${label} (${s.kmRun} km)`;
    }
    return label;
  });
  return `${total} session${total === 1 ? "" : "s"} last week — ${parts.join(", ")}.`;
}

export function computePhaseWeekNumber(
  phaseStartDate: string,
  date: string,
  totalWeeks: number
): number {
  const days = differenceInCalendarDays(parseISO(date), parseISO(phaseStartDate));
  const week = Math.floor(days / 7) + 1;
  return Math.min(Math.max(week, 1), totalWeeks);
}
