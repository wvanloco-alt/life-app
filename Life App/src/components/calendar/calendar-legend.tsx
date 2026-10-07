"use client";

import { ActivityMark } from "@/components/calendar/activity-mark";
import type { CalendarActivity } from "@/types";
import { cn } from "@/lib/utils";

interface CalendarLegendProps {
  activities: CalendarActivity[];
  filterActivityId: number | null;
  onFilter: (activityId: number | null) => void;
}

export function CalendarLegend({
  activities,
  filterActivityId,
  onFilter,
}: CalendarLegendProps) {
  const visible = activities.filter((a) => a.visible);

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((activity) => {
        const active = filterActivityId === activity.id;
        return (
          <button
            key={activity.id}
            type="button"
            onClick={() => onFilter(active ? null : activity.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
              active
                ? "border-foreground/30 bg-muted"
                : "border-border/60 hover:bg-muted/60"
            )}
          >
            <ActivityMark activity={activity} size="sm" />
            {activity.name}
          </button>
        );
      })}
      {filterActivityId != null && (
        <button
          type="button"
          onClick={() => onFilter(null)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Show all
        </button>
      )}
    </div>
  );
}
