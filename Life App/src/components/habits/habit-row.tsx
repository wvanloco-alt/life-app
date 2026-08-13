"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildImplementationIntention, shouldShowNeverMissTwice } from "@/lib/habit-v2-helpers";
import { computeStreaks } from "@/lib/habit-streaks";
import { cn } from "@/lib/utils";
import type { HabitWithRecentLogs } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO, subDays } from "date-fns";
import { ArchiveRestore, Gem, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { HabitCalendar } from "./habit-calendar";
import { HabitYearHeatmap } from "./habit-year-heatmap";

interface HabitRowProps {
  habit: HabitWithRecentLogs;
  logDates: string[];
  today: string;
  inFlightDates: Set<string>;
  affirmation?: string | null;
  error?: string | null;
  onToggle: (habitId: number, date: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchiveToggle: () => void;
}

export function HabitRow({
  habit,
  logDates,
  today,
  inFlightDates,
  affirmation,
  error,
  onToggle,
  onEdit,
  onDelete,
  onArchiveToggle,
}: HabitRowProps) {
  const { current: currentStreak } = computeStreaks(logDates, today);
  const thirtyDaysAgo = format(subDays(parseISO(today), 29), "yyyy-MM-dd");
  const doneLast30 = logDates.filter((d) => d >= thirtyDaysAgo && d <= today).length;
  const [viewMode, setViewMode] = useState<"log" | "year">("log");
  const intentionSentence = buildImplementationIntention(habit);
  const showNudge = !habit.isArchived && shouldShowNeverMissTwice(logDates, today);

  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-12 py-8 stagger-item ${
        habit.isArchived ? "opacity-50" : ""
      }`}
    >
      {/* ── Left: identity block ── */}
      <div className="w-60 shrink-0 flex flex-col gap-1 pt-1">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shrink-0 mt-0.5"
            style={{ backgroundColor: habit.color }}
            aria-hidden="true"
          />
          <div className="flex items-center gap-1.5 min-w-0">
            <p
              className={`font-display text-[17px] font-semibold leading-snug ${
                habit.isArchived ? "line-through text-muted-foreground" : ""
              }`}
            >
              {habit.identity || habit.name}
            </p>
            {habit.isKeystone && (
              <span title="Keystone habit." className="shrink-0">
                <Gem className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
            )}
          </div>
        </div>

        {habit.identity && (
          <p className="text-sm text-muted-foreground pl-6 leading-snug mt-1">
            {habit.name}
          </p>
        )}

        {intentionSentence && !habit.isArchived && (
          <p className="text-[11px] text-muted-foreground italic truncate pl-6 mt-0.5">
            {intentionSentence}
          </p>
        )}

        {!habit.isArchived && (
          <div className="pl-6 mt-4">
            <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums leading-none">
              {doneLast30}{" "}
              <span className="text-base font-normal text-muted-foreground">/ 30</span>
            </p>
            {currentStreak > 0 && (
              <p className="text-[11px] text-muted-foreground/50 mt-1 font-sans">
                {currentStreak}d streak
              </p>
            )}
          </div>
        )}

        {!habit.isArchived && affirmation && (
          <p className="pl-6 mt-2 text-xs text-muted-foreground animate-fade-in leading-snug">
            {affirmation}
          </p>
        )}
        {!habit.isArchived && !affirmation && showNudge && (
          <p className="pl-6 mt-2 text-xs text-muted-foreground leading-snug">
            Yesterday was a miss. Today is the one that counts.
          </p>
        )}
        {!habit.isArchived && !affirmation && !showNudge && error && (
          <p className="pl-6 mt-2 text-xs text-destructive leading-snug">{error}</p>
        )}

        {!habit.isArchived && (
          <div className="flex items-center gap-0.5 pl-[18px] mt-4">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit habit"
              className="p-2 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More options"
                  className="p-2 rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={onArchiveToggle}>
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {habit.isArchived && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="p-2 rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted/60 transition-colors ml-[18px] mt-4 w-fit"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={onArchiveToggle}>
                <ArchiveRestore className="w-4 h-4 mr-2" />
                Restore
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {!habit.isArchived && (
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex justify-end">
            <div className="flex rounded-md border border-border/40 text-[11px] overflow-hidden">
              <button
                type="button"
                className={cn(
                  "px-2.5 py-1",
                  viewMode === "log" ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setViewMode("log")}
              >
                Log
              </button>
              <button
                type="button"
                className={cn(
                  "px-2.5 py-1",
                  viewMode === "year" ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setViewMode("year")}
              >
                Year
              </button>
            </div>
          </div>

          {viewMode === "log" ? (
            <HabitCalendar
              recentLogDates={logDates}
              habitColor={habit.color}
              habitCreatedAt={habit.createdAt}
              today={today}
              inFlightDates={inFlightDates}
              onToggle={(date) => onToggle(habit.id, date)}
            />
          ) : (
            <HabitYearHeatmap
              logDates={logDates}
              habitColor={habit.color}
              habitCreatedAt={habit.createdAt}
              today={today}
            />
          )}
        </div>
      )}
    </div>
  );
}
