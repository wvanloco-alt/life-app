"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityMark, marksForDate } from "@/components/calendar/activity-mark";
import { Button } from "@/components/ui/button";
import { brusselsToday } from "@/lib/dates";
import type { CalendarActivity, CalendarDay } from "@/types";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MAX_MARKS = 3;

interface CalendarMonthProps {
  monthIso: string;
  days: CalendarDay[];
  activities: CalendarActivity[];
  selectedDate: string;
  filterActivityId: number | null;
  onSelectDate: (date: string) => void;
  onMonthChange: (monthIso: string) => void;
}

export function CalendarMonth({
  monthIso,
  days,
  activities,
  selectedDate,
  filterActivityId,
  onSelectDate,
  onMonthChange,
}: CalendarMonthProps) {
  const today = brusselsToday();
  const monthStart = parseISO(`${monthIso}-01`);
  const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(format(addMonths(monthStart, -1), "yyyy-MM"))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
          {format(monthStart, "MMMM yyyy")}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(format(addMonths(monthStart, 1), "yyyy-MM"))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[11px] font-medium text-muted-foreground/70">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {gridDays.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, monthStart);
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          const dayMarks = marksForDate(iso, days, activities, filterActivityId);
          const shown = dayMarks.slice(0, MAX_MARKS);
          const hiddenCount = dayMarks.length - shown.length;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={cn(
                "flex min-h-[4.75rem] flex-col items-stretch rounded-md border border-transparent px-1 pt-1.5 text-sm transition-colors",
                inMonth ? "text-foreground hover:bg-muted/70" : "text-muted-foreground/40",
                isSelected && "border-border bg-muted",
                isToday && "ring-1 ring-[var(--palette-amber-9)]/60"
              )}
            >
              <span className={cn("text-center tabular-nums", isToday && "font-semibold")}>
                {format(day, "d")}
              </span>
              <div className="mt-1 flex flex-col gap-0.5">
                {shown.map((act) => (
                  <ActivityMark key={act.id} activity={act} size="sm" className="w-full" />
                ))}
                {hiddenCount > 0 && (
                  <span className="text-center text-[10px] text-muted-foreground">+{hiddenCount}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
