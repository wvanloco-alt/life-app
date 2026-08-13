/** Normalized Garmin payloads used by sync planning (library-agnostic). */

export interface GarminPersistedSession {
  cookies?: string;
  oauth2Token: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    refresh_token_expires_in: number;
    expires_at?: number;
    refresh_token_expires_at?: number;
  };
  diClientId: string;
  /** Cached from social profile — used for daily summary API. */
  displayName?: string;
}

export interface GarminActivityRecord {
  garminActivityId: string;
  typeKey: string;
  date: string;
  durationMinutes: number;
  calories: number | null;
  steps: number | null;
  distanceMeters: number | null;
}

export interface GarminSleepRecord {
  date: string;
  score: number | null;
  durationMinutes: number;
  deepSleepMinutes: number | null;
  remSleepMinutes: number | null;
  lightSleepMinutes: number | null;
}

export interface GarminDailyMetricRecord {
  date: string;
  caloriesTotal: number | null;
  caloriesActive: number | null;
  steps: number | null;
}

export interface GarminFetchResult {
  activities: GarminActivityRecord[];
  sleep: GarminSleepRecord[];
  dailyMetrics: GarminDailyMetricRecord[];
  session: GarminPersistedSession;
}
