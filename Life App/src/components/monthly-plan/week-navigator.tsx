"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks } from "date-fns";
import { getWeekStartDate, isCurrentWeek } from "@/lib/dates";

interface WeekNavigatorProps {
  weekStartDate: string;
  onWeekChange: (weekStart: string) => void;
}

export function WeekNavigator({ weekStartDate, onWeekChange }: WeekNavigatorProps) {
  const weekStart = new Date(weekStartDate + "T00:00:00");
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const isCurrent = isCurrentWeek(weekStartDate);

  function goBack() {
    const prev = subWeeks(weekStart, 1);
    onWeekChange(getWeekStartDate(prev));
  }

  function goForward() {
    const next = addWeeks(weekStart, 1);
    onWeekChange(getWeekStartDate(next));
  }

  function goToday() {
    onWeekChange(getWeekStartDate(new Date()));
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={goBack}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[200px] text-center">
        <div className="font-semibold">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </div>
        {isCurrent && (
          <span className="text-xs text-emerald-500 font-medium">This week</span>
        )}
      </div>

      <Button variant="outline" size="icon" onClick={goForward}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={goToday}>
          Today
        </Button>
      )}
    </div>
  );
}
