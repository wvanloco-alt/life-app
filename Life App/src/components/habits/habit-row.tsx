"use client";

import { computeStreaks } from "@/lib/habit-streaks";
import type { HabitWithRecentLogs } from "@/types";
import { HabitStrip } from "./habit-strip";

interface HabitRowProps {
  habit: HabitWithRecentLogs;
  logDates: string[];
  today: string;
  inFlightDates: Set<string>;
  affirmation?: string | null;
  error?: string | null;
  onToggle: (habitId: number, date: string) => void;
}

export function HabitRow({
  habit,
  logDates,
  today,
  inFlightDates,
  affirmation,
  error,
  onToggle,
}: HabitRowProps) {
  const { current: currentStreak, best: bestStreak } = computeStreaks(
    logDates,
    today,
  );

  return (
    <div className="flex items-center gap-4 py-4 group stagger-item">
      {/* Color indicator */}
      <div
        className="w-2 h-2 rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: habit.color }}
        aria-hidden="true"
      />

      {/* Identity + name */}
      <div className="min-w-0 flex-1">
        {habit.identity && (
          <p className="text-[11px] text-muted-foreground leading-none mb-0.5 truncate font-display">
            {habit.identity}
          </p>
        )}
        <p className="text-sm font-medium leading-snug truncate">{habit.name}</p>
      </div>

      {/* 14-day strip + affirmation */}
      <div className="shrink-0">
        <HabitStrip
          recentLogDates={logDates}
          habitColor={habit.color}
          habitCreatedAt={habit.createdAt}
          today={today}
          inFlightDates={inFlightDates}
          affirmation={affirmation}
          error={error}
          onToggle={(date) => onToggle(habit.id, date)}
        />
      </div>

      {/* Streak */}
      <div className="shrink-0 text-right w-[72px]">
        <p className="text-base font-mono font-semibold leading-none tabular-nums">
          {currentStreak}
          <span className="text-[10px] text-muted-foreground font-sans font-normal ml-0.5">
            d
          </span>
        </p>
        {bestStreak > currentStreak && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
            best {bestStreak}
          </p>
        )}
      </div>
    </div>
  );
}
