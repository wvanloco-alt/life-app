"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateForDisplay } from "@/lib/dates";

interface HabitCalendarProps {
  recentLogDates: string[];
  habitColor: string;
  habitCreatedAt: string;
  today: string;
  inFlightDates: Set<string>;
  onToggle: (date: string) => void;
}

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Monday of the week containing `today`. */
function getMondayOf(today: string): Date {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0 = Sun
  const offset = dow === 0 ? 6 : dow - 1;
  const mon = new Date(dt);
  mon.setDate(dt.getDate() - offset);
  return mon;
}

function isoFrom(dt: Date): string {
  const y = dt.getFullYear();
  const m = (dt.getMonth() + 1).toString().padStart(2, "0");
  const d = dt.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekFrom(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return isoFrom(dt);
  });
}

function getThreeWeeks(today: string) {
  const thisMonday = getMondayOf(today);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);

  return [
    { label: "Last", dates: weekFrom(lastMonday) },
    { label: "This", dates: weekFrom(thisMonday) },
    { label: "Next", dates: weekFrom(nextMonday) },
  ];
}

export function HabitCalendar({
  recentLogDates,
  habitColor,
  habitCreatedAt,
  today,
  inFlightDates,
  onToggle,
}: HabitCalendarProps) {
  const weeks = getThreeWeeks(today);
  const logSet = new Set(recentLogDates);
  const createdDate = habitCreatedAt.slice(0, 10);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-1">
        {/* Day-of-week header */}
        <div className="flex gap-1 pl-[30px]">
          {DAY_LABELS.map((lbl) => (
            <div key={lbl} className="w-8 text-center text-[9px] text-muted-foreground/50 font-medium">
              {lbl}
            </div>
          ))}
        </div>

        {/* Three week rows */}
        {weeks.map(({ label, dates }) => (
          <div key={label} className="flex items-center gap-1">
            {/* Week label */}
            <div className="w-[26px] shrink-0 text-[9px] text-muted-foreground/40 text-right pr-1 font-medium leading-none">
              {label}
            </div>

            {dates.map((date) => {
              const isFuture = date > today;
              const isBeforeCreation = date < createdDate;
              const isInFlight = inFlightDates.has(date);
              const filled = logSet.has(date);
              const isToday = date === today;
              const num = parseInt(date.split("-")[2]);

              // Future or pre-creation: non-interactive
              if (isFuture || isBeforeCreation) {
                return (
                  <div
                    key={date}
                    className="w-8 h-8 rounded-md flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span
                      className={`text-xs font-mono ${
                        isFuture
                          ? "text-muted-foreground/20"
                          : "text-muted-foreground/15"
                      }`}
                    >
                      {num}
                    </span>
                  </div>
                );
              }

              return (
                <Tooltip key={date}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${formatDateForDisplay(date)}${filled ? " — done" : ""}`}
                      aria-pressed={filled}
                      disabled={isInFlight}
                      onClick={() => onToggle(date)}
                      className={[
                        "w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-medium transition-all duration-150",
                        isInFlight ? "opacity-60 cursor-wait" : "cursor-pointer hover:opacity-80 active:scale-95",
                        isToday && !filled ? "ring-1 ring-foreground/30 ring-offset-1" : "",
                        filled ? "text-white" : "text-muted-foreground/70 bg-muted/40",
                      ].filter(Boolean).join(" ")}
                      style={filled ? { backgroundColor: habitColor } : undefined}
                    >
                      {num}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {formatDateForDisplay(date)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
