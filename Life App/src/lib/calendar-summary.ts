export function countDistinctActivityDays(
  logs: { activityTypeId: number; date: string }[]
): number {
  const keys = new Set(logs.map((log) => `${log.activityTypeId}:${log.date}`));
  return keys.size;
}
