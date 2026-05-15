"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateForDisplay } from "@/lib/dates";

interface HabitStripProps {
  recentLogDates: string[];
  habitColor: string;
  habitCreatedAt: string;
  today: string;
  inFlightDates: Set<string>;
  affirmation?: string | null;
  error?: string | null;
  onToggle: (date: string) => void;
}

/**
 * Build the 14-date window ending on `today` (inclusive).
 * Uses string arithmetic so it stays pure and timezone-safe.
 */
function buildWindow(today: string): string[] {
  const dates: string[] = [];
  const [y, m, d] = today.split("-").map(Number);
  const anchor = new Date(y, m - 1, d);
  for (let i = 13; i >= 0; i--) {
    const cur = new Date(anchor);
    cur.setDate(anchor.getDate() - i);
    const yy = cur.getFullYear();
    const mm = (cur.getMonth() + 1).toString().padStart(2, "0");
    const dd = cur.getDate().toString().padStart(2, "0");
    dates.push(`${yy}-${mm}-${dd}`);
  }
  return dates;
}

export function HabitStrip({
  recentLogDates,
  habitColor,
  habitCreatedAt,
  today,
  inFlightDates,
  affirmation,
  error,
  onToggle,
}: HabitStripProps) {
  const window = buildWindow(today);
  const logSet = new Set(recentLogDates);

  // Normalise createdAt to a date-only string for comparison.
  const createdDate = habitCreatedAt.slice(0, 10);

  return (
    <div className="flex flex-col gap-1">
      <TooltipProvider delayDuration={200}>
        <div className="flex gap-[3px]" role="list" aria-label="14-day completion strip">
          {window.map((date) => {
            const isBeforeCreation = date < createdDate;
            const isInFlight = inFlightDates.has(date);
            const isLogged = logSet.has(date);
            const isToday = date === today;

            const filled = isLogged;

            const baseClasses =
              "h-[18px] w-[18px] rounded-[3px] transition-transform duration-150";

            if (isBeforeCreation) {
              return (
                <div
                  key={date}
                  role="listitem"
                  className={`${baseClasses} bg-muted/30`}
                  aria-hidden="true"
                />
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
                      baseClasses,
                      "cursor-pointer",
                      isInFlight ? "opacity-70 cursor-wait" : "hover:scale-110 active:scale-95",
                      isToday && !filled ? "ring-1 ring-offset-1 ring-muted-foreground/30" : "",
                      filled ? "" : "bg-muted/50",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={filled ? { backgroundColor: habitColor } : undefined}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-mono">
                  {formatDateForDisplay(date)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Inline affirmation or error — mutually exclusive */}
      {affirmation && (
        <p className="text-[11px] text-muted-foreground animate-fade-in leading-snug">
          {affirmation}
        </p>
      )}
      {!affirmation && error && (
        <p className="text-[11px] text-destructive leading-snug">{error}</p>
      )}
    </div>
  );
}
