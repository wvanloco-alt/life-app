/**
 * Maps Garmin Connect activity type keys to Life App activity type names.
 * See architecture.md — constants, not a DB table.
 */

const GARMIN_TYPE_TO_APP_NAME: Record<string, string> = {
  running: "Running",
  indoor_running: "Running",
  street_running: "Running",
  track_running: "Running",
  trail_running: "Running",
  treadmill_running: "Running",
  ultra_running: "Running",
  virtual_running: "Running",
  obstacle_course_racing: "Running",

  tennis: "Tennis",
  tennis_v2: "Tennis",
  platform_tennis: "Tennis",
  table_tennis: "Tennis",

  hiking: "Hiking",

  indoor_climbing: "Climbing (Gym)",
  bouldering: "Climbing (Gym)",
  floor_climbing: "Climbing (Gym)",
  rock_climbing: "Climbing (Outdoor)",

  cycling: "Cycling",
  road_cycling: "Cycling",
  mountain_biking: "Cycling",
  gravel_cycling: "Cycling",
  indoor_cycling: "Cycling",
  virtual_cycling: "Cycling",
  e_biking: "Cycling",
};

const FALLBACK_NAME = "Other";

/** Normalize Garmin `activityType.typeKey` to an app activity type name. */
export function mapGarminActivityType(typeKey: string): string {
  const key = typeKey.trim().toLowerCase();
  return GARMIN_TYPE_TO_APP_NAME[key] ?? FALLBACK_NAME;
}

export function isFallbackActivityType(appName: string): boolean {
  return appName === FALLBACK_NAME;
}
