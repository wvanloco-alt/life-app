"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateForDisplay } from "@/lib/dates";

interface HabitYearHeatmapProps {
  logDates: string[];
  habitColor: string;
  habitCreatedAt: string;
  today: string;
}

const EMPTY_CELL = "oklch(0.93 0.005 55)";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoFrom(dt: Date): string {
  const y = dt.getFullYear();
  const m = (dt.getMonth() + 1).toString().padStart(2, "0");
  const d = dt.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMondayOf(date: Date): Date {
  const dt = new Date(date);
  const dow = dt.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  dt.setDate(dt.getDate() - offset);
  return dt;
}

export function HabitYearHeatmap({
  logDates,
  habitColor,
  habitCreatedAt,
  today,
}: HabitYearHeatmapProps) {
  const year = Number(today.slice(0, 4));
  const logSet = new Set(logDates.filter((d) => d.startsWith(`${year}-`)));
  const createdDate = habitCreatedAt.slice(0, 10);

  const gridStart = getMondayOf(new Date(year, 0, 1));
  const columns: string[][] = Array.from({ length: 53 }, () => []);

  for (let col = 0; col < 53; col++) {
    for (let row = 0; row < 7; row++) {
      const dt = new Date(gridStart);
      dt.setDate(gridStart.getDate() + col * 7 + row);
      columns[col].push(isoFrom(dt));
    }
  }

  const monthLabels = columns.map((colDates, index) => {
    const firstInYear = colDates.find((d) => d.startsWith(`${year}-`));
    if (!firstInYear) return null;
    const monthIndex = Number(firstInYear.slice(5, 7)) - 1;
    const prevCol = index > 0 ? columns[index - 1][0] : null;
    const prevMonth = prevCol ? Number(prevCol.slice(5, 7)) : null;
    if (prevMonth === monthIndex + 1) return null;
    return MONTHS[monthIndex] ?? null;
  });

  function cellState(date: string): "filled" | "future" | "beforeCreation" | "empty" {
    if (date < createdDate) return "beforeCreation";
    if (date > today) return "future";
    if (logSet.has(date)) return "filled";
    return "empty";
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="min-h-[168px]">
        <div className="relative mb-2 h-4">
          {monthLabels.map((label, index) =>
            label ? (
              <span
                key={`${label}-${index}`}
                className="absolute top-0 text-[11px] text-muted-foreground"
                style={{ left: `${index * 14}px` }}
              >
                {label}
              </span>
            ) : null
          )}
        </div>
        <div className="flex gap-[2px]">
          {columns.map((colDates, colIndex) => (
            <div
              key={colIndex}
              className="flex flex-col gap-[2px] animate-fade-in"
              style={{ animationDelay: `${colIndex * 8}ms` }}
            >
              {colDates.map((date) => {
                const state = cellState(date);
                const isToday = date === today;
                const isPast =
                  state !== "future" && state !== "beforeCreation" && date <= today;
                const cell = (
                  <div
                    className="h-3 w-3 rounded-[3px]"
                    style={{
                      backgroundColor: state === "filled" ? habitColor : EMPTY_CELL,
                      outline: isToday ? "1px solid rgba(0,0,0,0.2)" : undefined,
                      outlineOffset: isToday ? "1px" : undefined,
                    }}
                  />
                );

                if (!isPast) {
                  return <div key={date}>{cell}</div>;
                }

                return (
                  <Tooltip key={date}>
                    <TooltipTrigger asChild>
                      <div>{cell}</div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {formatDateForDisplay(date)}
                      {state === "filled" ? " · Done" : ""}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
