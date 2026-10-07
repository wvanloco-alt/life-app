"use client";

import { addWeeks, eachDayOfInterval, endOfWeek, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityMark, marksForDate } from "@/components/calendar/activity-mark";
import { Button } from "@/components/ui/button";
import { brusselsToday } from "@/lib/dates";
import type { CalendarActivity, CalendarDay } from "@/types";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface CalendarWeekProps {
  weekStart: string;
  days: CalendarDay[];
  activities: CalendarActivity[];
  selectedDate: string;
  filterActivityId: number | null;
  onSelectDate: (date: string) => void;
  onWeekChange: (weekStart: string) => void;
}

export function CalendarWeek({
  weekStart,
  days,
  activities,
  selectedDate,
  filterActivityId,
  onSelectDate,
  onWeekChange,
}: CalendarWeekProps) {
  const today = brusselsToday();
  const start = parseISO(weekStart);
  const end = endOfWeek(start, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start, end });

  const rangeLabel = `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() =>
            onWeekChange(format(addWeeks(parseISO(weekStart), -1), "yyyy-MM-dd"))
          }
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
          {rangeLabel}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() =>
            onWeekChange(format(addWeeks(parseISO(weekStart), 1), "yyyy-MM-dd"))
          }
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const iso = format(day, "yyyy-MM-dd");
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          const dayMarks = marksForDate(iso, days, activities, filterActivityId);

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={cn(
                "flex min-h-[7.5rem] flex-col items-stretch rounded-md border border-border/40 px-1.5 py-2 transition-colors hover:bg-muted/70",
                isSelected && "bg-muted border-border",
                isToday && "ring-1 ring-[var(--palette-amber-9)]/60"
              )}
            >
              <span className="text-center text-[11px] text-muted-foreground">{DAY_LABELS[index]}</span>
              <span className={cn("text-center text-sm tabular-nums", isToday && "font-semibold")}>
                {format(day, "d")}
              </span>
              <div className="mt-2 flex flex-col gap-1">
                {dayMarks.map((act) => (
                  <ActivityMark key={act.id} activity={act} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
