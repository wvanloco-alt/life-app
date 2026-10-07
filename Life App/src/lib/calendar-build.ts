import type { CalendarDay, CalendarDayCompletion } from "@/types";

export type LogRow = {
  date: string;
  activityTypeId: number;
  source: string;
};

export function buildCalendarDays(
  from: string,
  to: string,
  logs: LogRow[],
  visibleTypeIds: Set<number>
): CalendarDay[] {
  const byDate = new Map<string, Map<number, { hasCalendar: boolean; hasLocked: boolean }>>();

  for (const log of logs) {
    if (!visibleTypeIds.has(log.activityTypeId)) continue;
    if (log.date < from || log.date > to) continue;

    let perType = byDate.get(log.date);
    if (!perType) {
      perType = new Map();
      byDate.set(log.date, perType);
    }

    const entry = perType.get(log.activityTypeId) ?? {
      hasCalendar: false,
      hasLocked: false,
    };

    if (log.source === "calendar") {
      entry.hasCalendar = true;
    } else {
      entry.hasLocked = true;
    }
    perType.set(log.activityTypeId, entry);
  }

  const days: CalendarDay[] = [];
  const [y0, m0, d0] = from.split("-").map(Number);
  const [y1, m1, d1] = to.split("-").map(Number);
  const start = new Date(y0, m0 - 1, d0);
  const end = new Date(y1, m1 - 1, d1);

  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const dt = new Date(t);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const perType = byDate.get(iso);
    const completions: CalendarDayCompletion[] = [];

    if (perType) {
      for (const [activityTypeId, flags] of perType) {
        if (flags.hasCalendar || flags.hasLocked) {
          completions.push({
            activityTypeId,
            locked: flags.hasLocked,
          });
        }
      }
    }

    days.push({ date: iso, completions });
  }

  return days;
}
