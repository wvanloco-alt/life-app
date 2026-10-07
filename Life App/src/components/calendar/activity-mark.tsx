"use client";

import { getLucideIcon } from "@/lib/icons";
import { usePalette } from "@/hooks/use-palette";
import type { PaletteColor } from "@/lib/palette";
import type { CalendarActivity, CalendarDay } from "@/types";
import { cn } from "@/lib/utils";

interface ActivityMarkProps {
  activity: CalendarActivity;
  size?: "sm" | "md";
  className?: string;
}

export function ActivityMark({ activity, size = "md", className }: ActivityMarkProps) {
  const palette = usePalette();
  const Icon = getLucideIcon(activity.icon);
  const color = palette.color(activity.color as PaletteColor);

  return (
    <span
      title={activity.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-white",
        size === "md" ? "h-8 w-full" : "h-6 w-6",
        className
      )}
      style={{ backgroundColor: color }}
    >
      {Icon ? (
        <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
      ) : (
        <span className="text-[10px] font-semibold leading-none">
          {activity.name.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

export function marksForDate(
  iso: string,
  days: CalendarDay[],
  activities: CalendarActivity[],
  filterActivityId: number | null
): CalendarActivity[] {
  const day = days.find((d) => d.date === iso);
  if (!day) return [];

  const byId = new Map(activities.map((a) => [a.id, a]));
  const seen = new Set<number>();
  const marks: CalendarActivity[] = [];

  for (const completion of day.completions) {
    if (filterActivityId != null && completion.activityTypeId !== filterActivityId) continue;
    const activity = byId.get(completion.activityTypeId);
    if (!activity?.visible || seen.has(activity.id)) continue;
    seen.add(activity.id);
    marks.push(activity);
  }

  marks.sort((a, b) => a.name.localeCompare(b.name));
  return marks;
}
