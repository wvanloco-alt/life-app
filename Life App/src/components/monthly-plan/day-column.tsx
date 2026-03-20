"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Circle, Repeat, FileCheck, FileText } from "lucide-react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { isToday } from "@/lib/dates";
import { getQuadrantInfo } from "@/lib/quadrants";
import type { Activity, RecurringActivity } from "@/types";

interface DayColumnProps {
  date: Date;
  activities: Activity[];
  recurringActivities?: RecurringActivity[];
  onAddActivity: (date: string, startTime?: string) => void;
  onToggleActivity: (id: number, isCompleted: boolean) => void;
  onClickActivity: (activity: Activity) => void;
  compact?: boolean;
}

function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function DraggableActivity({
  activity,
  onToggle,
  onClick,
}: {
  activity: Activity;
  onToggle: (id: number, val: boolean) => void;
  onClick: (a: Activity) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `activity-${activity.id}`,
    data: { activity },
  });

  const quadrant = getQuadrantInfo(activity.quadrant);
  const style: React.CSSProperties = {
    backgroundColor: activity.roleColor
      ? `${activity.roleColor}20`
      : `${quadrant.hexColor}15`,
    borderLeft: `3px solid ${activity.roleColor ?? quadrant.hexColor}`,
    ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : {}),
    opacity: isDragging ? 0.4 : activity.isCompleted ? 0.5 : 1,
    cursor: "grab",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClick(activity)}
      role="button"
      tabIndex={0}
      className="w-full text-left rounded px-1.5 py-1 text-xs transition-opacity hover:opacity-80"
      style={style}
    >
      <div className="flex items-start gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(activity.id, !activity.isCompleted);
          }}
          className="mt-0.5 shrink-0"
        >
          {activity.isCompleted ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        <div className="min-w-0">
          <div
            className={`font-medium truncate flex items-center gap-1 ${
              activity.isCompleted ? "line-through" : ""
            }`}
          >
            <span className="truncate">{activity.title}</span>
            {activity.notes && (
              <FileText className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" />
            )}
          </div>
          <div className="text-muted-foreground">
            {activity.startTime}–{activity.endTime}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DayColumn({
  date,
  activities,
  recurringActivities: recurring = [],
  onAddActivity,
  onToggleActivity,
  onClickActivity,
  compact = false,
}: DayColumnProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const today = isToday(date);
  const dayOfWeek = getDayOfWeek(date);

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { date: dateStr },
  });

  const dayRecurring = recurring.filter(
    (r) => r.dayOfWeek === dayOfWeek && !r.isPaused
  );

  const allItems = [
    ...dayRecurring.map((r) => ({
      type: "recurring" as const,
      id: `rec-${r.id}`,
      title: r.title,
      startTime: r.startTime,
      endTime: r.endTime,
      roleColor: r.roleColor ?? null,
      quadrant: r.quadrant,
      isCompleted: false,
    })),
    ...activities.map((a) => ({
      type: "activity" as const,
      id: `act-${a.id}`,
      title: a.title,
      startTime: a.startTime,
      endTime: a.endTime,
      roleColor: a.roleColor ?? null,
      quadrant: a.quadrant,
      isCompleted: a.isCompleted,
      isLogEntry: a.isLogEntry,
      activity: a,
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg p-2 border-2 transition-colors duration-150 ${
        isOver
          ? "border-primary/50 bg-primary/5"
          : today
            ? "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20"
            : "border-transparent bg-muted/15"
      }`}
    >
      <div className="mb-1.5 text-center">
        <div className="text-[10px] text-muted-foreground leading-tight">
          {format(date, "EEE")}
        </div>
        <div
          className={`text-base font-semibold leading-tight ${
            today ? "text-emerald-600" : ""
          }`}
        >
          {format(date, "d")}
        </div>
      </div>

      <div className={`flex-1 space-y-1 ${compact ? "min-h-[50px]" : "min-h-[120px]"}`}>
        {allItems.map((item) => {
          const quadrant = getQuadrantInfo(item.quadrant);

          if (item.type === "recurring") {
            return (
              <div
                key={item.id}
                className="w-full rounded px-1.5 py-1 text-xs border border-dashed"
                style={{
                  borderColor: item.roleColor ?? quadrant.hexColor,
                  color: item.roleColor ?? quadrant.hexColor,
                }}
              >
                <div className="flex items-center gap-1">
                  <Repeat className="h-2.5 w-2.5 shrink-0" />
                  <span className="font-medium truncate">{item.title}</span>
                </div>
                <div className="text-muted-foreground">
                  {item.startTime}–{item.endTime}
                </div>
              </div>
            );
          }

          const activity = item.activity!;

          if (activity.isLogEntry) {
            return (
              <div
                key={item.id}
                onClick={() => onClickActivity(activity)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onClickActivity(activity);
                }}
                className="w-full text-left rounded px-1.5 py-1 text-xs cursor-pointer transition-opacity hover:opacity-80 opacity-75 bg-muted/50 border border-muted"
              >
                <div className="flex items-start gap-1">
                  <FileCheck className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{activity.title}</div>
                    <span className="text-[10px] text-muted-foreground px-1 py-0.5 rounded bg-muted">
                      logged
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <DraggableActivity
              key={item.id}
              activity={activity}
              onToggle={onToggleActivity}
              onClick={onClickActivity}
            />
          );
        })}
      </div>

      {compact ? (
        <button
          type="button"
          className="mt-1 w-full flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 rounded py-0.5 transition-colors"
          onClick={() => onAddActivity(dateStr)}
        >
          <Plus className="h-3 w-3" />
        </button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full text-xs"
          onClick={() => onAddActivity(dateStr)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      )}
    </div>
  );
}
