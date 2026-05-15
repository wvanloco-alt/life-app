"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { computeStreaks } from "@/lib/habit-streaks";
import type { HabitWithRecentLogs } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { HabitCalendar } from "./habit-calendar";

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
  const { current: currentStreak, best: bestStreak } = computeStreaks(logDates, today);

  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4 stagger-item ${
        habit.isArchived ? "opacity-60" : ""
      }`}
    >
      {/* ── Card header ── */}
      <div className="flex items-start gap-2">
        {/* Color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: habit.color }}
          aria-hidden="true"
        />

        {/* Identity + name */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-display text-[14px] font-semibold leading-snug ${
              habit.isArchived ? "line-through" : ""
            }`}
          >
            {habit.identity || habit.name}
          </p>
          {habit.identity && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {habit.name}
            </p>
          )}
        </div>

        {/* Streak */}
        {!habit.isArchived && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-mono font-semibold tabular-nums leading-none">
              {currentStreak}
              <span className="text-[10px] text-muted-foreground font-sans font-normal ml-0.5">d</span>
            </p>
            {bestStreak > currentStreak && bestStreak > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                best {bestStreak}
              </p>
            )}
          </div>
        )}

        {/* Edit — always visible for active habits */}
        {!habit.isArchived && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit habit"
            className="shrink-0 p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Kebab */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More options"
              className="shrink-0 p-1 rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onArchiveToggle}>
              <ArchiveRestore className="w-3.5 h-3.5 mr-2" />
              {habit.isArchived ? "Restore" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── 3-week calendar ── */}
      {!habit.isArchived && (
        <>
          <HabitCalendar
            recentLogDates={logDates}
            habitColor={habit.color}
            habitCreatedAt={habit.createdAt}
            today={today}
            inFlightDates={inFlightDates}
            onToggle={(date) => onToggle(habit.id, date)}
          />
          {/* Inline feedback */}
          {affirmation && (
            <p className="text-[11px] text-muted-foreground animate-fade-in leading-snug -mt-1">
              {affirmation}
            </p>
          )}
          {!affirmation && error && (
            <p className="text-[11px] text-destructive leading-snug -mt-1">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
