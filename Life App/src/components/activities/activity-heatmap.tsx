"use client";

import { useMemo } from "react";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActivityHeatmapProps {
  data: Record<string, number>;
  weeks?: number;
}

export function ActivityHeatmap({ data, weeks = 12 }: ActivityHeatmapProps) {
  const days = useMemo(() => {
    const today = new Date();
    // Start at Monday of the week `weeks` ago
    const startDate = startOfWeek(subDays(today, weeks * 7), { weekStartsOn: 1 });
    
    const allDays = [];
    for (let i = 0; i < (weeks + 1) * 7; i++) {
      const d = addDays(startDate, i);
      if (d > today) break;
      allDays.push(d);
    }
    return allDays;
  }, [weeks]);

  // Group by weeks
  const weeksData = useMemo(() => {
    const wks = [];
    for (let i = 0; i < days.length; i += 7) {
      wks.push(days.slice(i, i + 7));
    }
    return wks;
  }, [days]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/30 border-border/40";
    if (count === 1) return "bg-emerald-200 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-800";
    if (count === 2) return "bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600";
    if (count >= 3) return "bg-emerald-600 dark:bg-emerald-500 border-emerald-700 dark:border-emerald-400";
    return "bg-muted";
  };

  return (
    <div className="flex flex-col gap-2 w-full overflow-x-auto pb-2">
      <div className="flex text-xs text-muted-foreground gap-2 min-w-max">
        <div className="w-8 shrink-0 flex flex-col justify-between py-0.5">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
          <span>Sun</span>
        </div>
        <div className="flex gap-1.5 flex-1">
          {weeksData.map((week, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {week.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const count = data[dateStr] || 0;
                return (
                  <TooltipProvider key={dateStr}>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-3.5 h-3.5 rounded-[3px] border ${getColor(count)} transition-all hover:ring-2 ring-primary/30 ring-offset-1 ring-offset-background cursor-pointer`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">
                          <span className="font-medium">{count === 0 ? "No" : count} activit{count === 1 ? "y" : "ies"}</span> on {format(day, "MMM d, yyyy")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
              {/* Fill empty spots if the last week is incomplete */}
              {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, idx) => (
                <div key={`empty-${idx}`} className="w-3.5 h-3.5 bg-transparent" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end items-center gap-2 text-xs text-muted-foreground mt-1">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3.5 h-3.5 rounded-[3px] border bg-muted/30 border-border/40" />
          <div className="w-3.5 h-3.5 rounded-[3px] border bg-emerald-200 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-800" />
          <div className="w-3.5 h-3.5 rounded-[3px] border bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600" />
          <div className="w-3.5 h-3.5 rounded-[3px] border bg-emerald-600 dark:bg-emerald-500 border-emerald-700 dark:border-emerald-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
