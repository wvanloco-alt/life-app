import { addDays, format, subDays } from "date-fns";
import { DateTime } from "luxon";
import type {
  GarminActivityRecord,
  GarminDailyMetricRecord,
  GarminFetchResult,
  GarminPersistedSession,
  GarminSleepRecord,
} from "./garmin-types";

export class GarminClientUnavailableError extends Error {
  constructor(message = "Garmin Connect client is not available on this platform. Use Docker or deploy to Railway.") {
    super(message);
    this.name = "GarminClientUnavailableError";
  }
}

type GarminModule = typeof import("garmin-connect-client");

async function loadGarminModule(): Promise<GarminModule> {
  try {
    return await import("garmin-connect-client");
  } catch {
    throw new GarminClientUnavailableError();
  }
}

function toIsoDate(localIso: string): string {
  return localIso.slice(0, 10);
}

function activityLocalDate(startTimeLocal: string): string {
  return toIsoDate(startTimeLocal);
}

function normalizeActivity(activity: {
  activityId: number;
  activityType: { typeKey: string };
  startTimeLocal: string;
  duration: number;
  calories?: number;
  steps?: number;
  distance?: number;
}): GarminActivityRecord {
  return {
    garminActivityId: String(activity.activityId),
    typeKey: activity.activityType.typeKey,
    date: activityLocalDate(activity.startTimeLocal),
    durationMinutes: Math.max(1, Math.round(activity.duration / 60)),
    calories: activity.calories ?? null,
    steps: activity.steps ?? null,
    distanceMeters: activity.distance ?? null,
  };
}

function normalizeSleep(daily: {
  dailySleepDTO: {
    calendarDate: string;
    sleepTimeSeconds: number | null;
    deepSleepSeconds: number | null;
    remSleepSeconds: number | null;
    lightSleepSeconds: number | null;
    sleepScores?: { overall?: { value?: number } };
  };
}): GarminSleepRecord | null {
  const dto = daily.dailySleepDTO;
  if (!dto.calendarDate) return null;
  const durationSeconds = dto.sleepTimeSeconds ?? 0;
  if (durationSeconds <= 0 && !dto.sleepScores?.overall?.value) return null;

  return {
    date: dto.calendarDate,
    score: dto.sleepScores?.overall?.value ?? null,
    durationMinutes: Math.round(durationSeconds / 60),
    deepSleepMinutes: dto.deepSleepSeconds != null ? Math.round(dto.deepSleepSeconds / 60) : null,
    remSleepMinutes: dto.remSleepSeconds != null ? Math.round(dto.remSleepSeconds / 60) : null,
    lightSleepMinutes: dto.lightSleepSeconds != null ? Math.round(dto.lightSleepSeconds / 60) : null,
  };
}

function normalizeDailySummary(summary: {
  calendarDate: string;
  calories?: { burnedTotal?: number; burnedActive?: number };
  movement?: { steps?: { value?: number } };
}): GarminDailyMetricRecord {
  return {
    date: summary.calendarDate,
    caloriesTotal: summary.calories?.burnedTotal ?? null,
    caloriesActive: summary.calories?.burnedActive ?? null,
    steps: summary.movement?.steps?.value ?? null,
  };
}

async function fetchDisplayName(session: GarminPersistedSession): Promise<string | undefined> {
  if (session.displayName) return session.displayName;
  const url = "https://connectapi.garmin.com/userprofile-service/socialProfile";
  const res = await garminApiGet<{ displayName?: string }>(session, url);
  return res.displayName;
}

async function garminApiGet<T>(session: GarminPersistedSession, url: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.oauth2Token.access_token}`,
    "di-client-id": session.diClientId,
  };
  if (session.cookies) headers.Cookie = session.cookies;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Garmin API ${res.status}: ${url}`);
  }
  return (await res.json()) as T;
}

type RawGarminActivity = {
  activityId: number;
  activityType: { typeKey: string };
  startTimeLocal: string;
  duration: number;
  calories?: number;
  steps?: number;
  distance?: number;
};

/** Fetch activities via Garmin API directly — bypasses library Zod validation for unknown typeKeys like tennis_v2. */
async function fetchActivities(
  session: GarminPersistedSession,
  start: number,
  limit: number
): Promise<RawGarminActivity[]> {
  const url = `https://connectapi.garmin.com/activitylist-service/activities/search/activities?start=${start}&limit=${limit}`;
  const raw = await garminApiGet<unknown>(session, url);
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item): RawGarminActivity | null => {
      if (!item || typeof item !== "object") return null;
      const activity = item as Record<string, unknown>;
      const activityType = activity.activityType;
      const typeKey =
        activityType &&
        typeof activityType === "object" &&
        "typeKey" in activityType &&
        typeof (activityType as { typeKey?: unknown }).typeKey === "string"
          ? (activityType as { typeKey: string }).typeKey
          : "other";

      const activityId = Number(activity.activityId);
      const startTimeLocal =
        typeof activity.startTimeLocal === "string" ? activity.startTimeLocal : "";
      const duration = Number(activity.duration ?? 0);
      if (!Number.isFinite(activityId) || !startTimeLocal) return null;

      return {
        activityId,
        activityType: { typeKey },
        startTimeLocal,
        duration,
        calories:
          activity.calories != null && Number.isFinite(Number(activity.calories))
            ? Number(activity.calories)
            : undefined,
        steps:
          activity.steps != null && Number.isFinite(Number(activity.steps))
            ? Number(activity.steps)
            : undefined,
        distance:
          activity.distance != null && Number.isFinite(Number(activity.distance))
            ? Number(activity.distance)
            : undefined,
      };
    })
    .filter((activity): activity is RawGarminActivity => activity != null);
}

async function fetchDailySummary(
  session: GarminPersistedSession,
  displayName: string,
  date: string
): Promise<GarminDailyMetricRecord | null> {
  const url = `https://connectapi.garmin.com/usersummary-service/usersummary/daily/${encodeURIComponent(displayName)}?calendarDate=${date}`;
  try {
    const raw = await garminApiGet<{
      calendarDate?: string;
      totalKilocalories?: number;
      activeKilocalories?: number;
      totalSteps?: number;
      calories?: { burnedTotal?: number; burnedActive?: number };
      movement?: { steps?: { value?: number } };
    }>(session, url);

    if (raw.calendarDate && (raw.totalKilocalories != null || raw.totalSteps != null)) {
      return {
        date: raw.calendarDate,
        caloriesTotal: raw.totalKilocalories != null ? Math.round(raw.totalKilocalories) : null,
        caloriesActive: raw.activeKilocalories != null ? Math.round(raw.activeKilocalories) : null,
        steps: raw.totalSteps ?? null,
      };
    }
    return normalizeDailySummary({
      calendarDate: raw.calendarDate ?? date,
      calories: raw.calories ?? {
        burnedTotal: raw.totalKilocalories,
        burnedActive: raw.activeKilocalories,
      },
      movement: raw.movement ?? { steps: { value: raw.totalSteps } },
    });
  } catch {
    return null;
  }
}

export type GarminLoginResult =
  | { status: "connected"; session: GarminPersistedSession; garminEmail: string }
  | { status: "mfa_required"; pendingCookies: string };

export async function loginGarmin(args: {
  email: string;
  password: string;
  mfaCode?: string;
  pendingCookies?: string;
}): Promise<GarminLoginResult> {
  const garmin = await loadGarminModule();

  if (args.pendingCookies && args.mfaCode) {
    const client = await garmin.login({ mfaRequired: true, cookies: args.pendingCookies }, args.mfaCode);
    const session = client.getSession() as GarminPersistedSession;
    const displayName = await fetchDisplayName(session);
    return {
      status: "connected",
      session: { ...session, displayName },
      garminEmail: args.email,
    };
  }

  const result = await garmin.login({ username: args.email, password: args.password });
  if (result.mfaRequired) {
    return { status: "mfa_required", pendingCookies: result.cookies };
  }

  const session = result.client.getSession() as GarminPersistedSession;
  const displayName = await fetchDisplayName(session);
  return {
    status: "connected",
    session: { ...session, displayName },
    garminEmail: args.email,
  };
}

export async function restoreGarminClient(session: GarminPersistedSession) {
  const garmin = await loadGarminModule();
  return garmin.fromSession(session);
}

export async function fetchGarminData(
  session: GarminPersistedSession,
  days: number
): Promise<GarminFetchResult> {
  const client = await restoreGarminClient(session);
  const updatedSession = client.getSession() as GarminPersistedSession;
  const mergedSession: GarminPersistedSession = {
    ...updatedSession,
    displayName: session.displayName ?? updatedSession.displayName,
  };

  const displayName = mergedSession.displayName ?? (await fetchDisplayName(mergedSession));
  if (displayName) mergedSession.displayName = displayName;

  const startDate = subDays(new Date(), days - 1);
  const endDate = new Date();

  const limit = Math.min(200, days * 10);
  const rawActivities = await fetchActivities(mergedSession, 0, limit);
  const startIso = format(startDate, "yyyy-MM-dd");
  const endIso = format(endDate, "yyyy-MM-dd");

  const activities = rawActivities
    .map(normalizeActivity)
    .filter((a) => a.date >= startIso && a.date <= endIso);

  const sleep: GarminSleepRecord[] = [];
  const dailyMetrics: GarminDailyMetricRecord[] = [];

  let cursor = startDate;
  while (cursor <= endDate) {
    const dateStr = format(cursor, "yyyy-MM-dd");
    try {
      const dailySleep = await client.sleep.getDailySleepData(DateTime.fromISO(dateStr));
      const normalized = normalizeSleep(dailySleep as Parameters<typeof normalizeSleep>[0]);
      if (normalized) sleep.push(normalized);
    } catch {
      // Missing sleep for a day is normal.
    }

    if (displayName) {
      const summary = await fetchDailySummary(mergedSession, displayName, dateStr);
      if (summary) dailyMetrics.push(summary);
    }

    cursor = addDays(cursor, 1);
  }

  return {
    activities,
    sleep,
    dailyMetrics,
    session: mergedSession,
  };
}
