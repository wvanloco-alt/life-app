/**
 * Dev-only: seed sleep, daily metrics, and activity logs from a Garmin MCP export snapshot.
 *
 * Usage:
 *   npx tsx src/scripts/seed-garmin-demo-from-mcp.ts
 *   SEED_USERNAME=admin DB_PATH=/data/life-app.db npx tsx src/scripts/seed-garmin-demo-from-mcp.ts
 *
 * Re-running is safe — skips activities already linked by garmin_activity_id.
 */

import { readFileSync } from "fs";
import path from "path";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { applyGarminSyncPlan } from "../lib/garmin-sync-apply";
import { planGarminSync } from "../lib/garmin-sync";
import type {
  GarminActivityRecord,
  GarminDailyMetricRecord,
  GarminSleepRecord,
} from "../lib/garmin-types";

process.env.DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "life-app.db");

interface McpExport {
  activities: Array<{
    id: number;
    type: string;
    start_time: string;
    distance_meters: number;
    duration_seconds: number;
    calories: number;
    steps: number;
  }>;
  sleep: Array<{
    date: string;
    sleep_score: number;
    sleep_seconds: number;
    deep_sleep_seconds: number;
    rem_sleep_seconds: number;
    light_sleep_seconds: number;
  }>;
  dailyStats: Array<{
    date: string;
    total_calories: number;
    active_calories: number;
    total_steps: number;
  }>;
}

function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

function loadExport(): McpExport {
  const filePath = path.join(__dirname, "data", "garmin-mcp-demo-export.json");
  return JSON.parse(readFileSync(filePath, "utf8")) as McpExport;
}

function resolveUserId(): string {
  const dbPath = process.env.DB_PATH!;
  const sqlite = new Database(dbPath, { readonly: true });
  const username = process.env.SEED_USERNAME || "admin";
  const row = sqlite
    .prepare("SELECT id, username FROM users WHERE username = ? LIMIT 1")
    .get(username) as { id: string; username: string } | undefined;

  if (!row) {
    const anyUser = sqlite.prepare("SELECT id, username FROM users LIMIT 1").get() as
      | { id: string; username: string }
      | undefined;
    sqlite.close();
    if (!anyUser) {
      console.error("\nNo users in database. Log in once or run create-admin.ts first.\n");
      process.exit(1);
    }
    console.log(`User "${username}" not found — using "${anyUser.username}" instead.`);
    return anyUser.id;
  }

  sqlite.close();
  console.log(`Seeding data for user "${row.username}" (${row.id})`);
  return row.id;
}

async function main() {
  const exportData = loadExport();
  const userId = resolveUserId();
  const today = format(new Date(), "yyyy-MM-dd");

  const activities: GarminActivityRecord[] = exportData.activities.map((a) => ({
    garminActivityId: String(a.id),
    typeKey: a.type,
    date: a.start_time.slice(0, 10),
    durationMinutes: secondsToMinutes(a.duration_seconds),
    calories: a.calories,
    steps: a.steps,
    distanceMeters: a.distance_meters,
  }));

  const sleep: GarminSleepRecord[] = exportData.sleep.map((s) => ({
    date: s.date,
    score: s.sleep_score,
    durationMinutes: secondsToMinutes(s.sleep_seconds),
    deepSleepMinutes: secondsToMinutes(s.deep_sleep_seconds),
    remSleepMinutes: secondsToMinutes(s.rem_sleep_seconds),
    lightSleepMinutes: secondsToMinutes(s.light_sleep_seconds),
  }));

  const dailyMetrics: GarminDailyMetricRecord[] = exportData.dailyStats.map((d) => ({
    date: d.date,
    caloriesTotal: d.total_calories,
    caloriesActive: d.active_calories,
    steps: d.total_steps,
  }));

  const { db } = await import("../db");
  const { activityLogs } = await import("../db/schema");

  const existingIds = await db
    .select({ garminActivityId: activityLogs.garminActivityId })
    .from(activityLogs)
    .where(eq(activityLogs.userId, userId));

  const existingGarminActivityIds = new Set(
    existingIds
      .map((r) => r.garminActivityId)
      .filter((id): id is string => id != null && id.length > 0)
  );

  const syncPlan = planGarminSync({
    activities,
    sleep,
    dailyMetrics,
    existingGarminActivityIds,
    scheduledSessions: [],
    today,
  });

  const counts = await applyGarminSyncPlan(userId, syncPlan);

  console.log("\nGarmin demo seed complete:");
  console.log(`  Activities added:      ${counts.activitiesAdded}`);
  console.log(`  Sleep records upserted: ${counts.sleepRecordsUpserted}`);
  console.log(`  Daily metrics updated:  ${counts.dailyMetricsUpdated}`);
  console.log(`\nOpen http://localhost:3000/dashboard to preview.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
