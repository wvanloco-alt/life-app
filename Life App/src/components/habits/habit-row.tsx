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
import {
  ArchiveRestore,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { HabitStrip } from "./habit-strip";

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
  /** Archive active -> archived, or restore archived -> active */
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
  const { current: currentStreak, best: bestStreak } = computeStreaks(
    logDates,
    today,
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 py-4 group stagger-item bg-background ${
        habit.isArchived ? "opacity-60" : ""
      }`}
    >
      {/* Drag handle — hidden on archived rows */}
      {!habit.isArchived && (
        <button
          type="button"
          className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {/* Color indicator */}
      <div
        className="w-2 h-2 rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: habit.color }}
        aria-hidden="true"
      />

      {/* Identity + name */}
      <div className="min-w-0 flex-1">
        {habit.identity && (
          <p
            className={`text-[11px] text-muted-foreground leading-none mb-0.5 truncate font-display ${
              habit.isArchived ? "line-through" : ""
            }`}
          >
            {habit.identity}
          </p>
        )}
        <p className="text-sm font-medium leading-snug truncate">{habit.name}</p>
      </div>

      {/* 14-day strip + affirmation (active only) */}
      {!habit.isArchived && (
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
      )}

      {/* Streak (active only) */}
      {!habit.isArchived && (
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
      )}

      {/* Kebab menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Habit options"
            className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {!habit.isArchived && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
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
  );
}
