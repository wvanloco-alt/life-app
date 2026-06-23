"use client";

import { useState, useLayoutEffect, useRef, useMemo } from "react";
import {
  DndContext,
  MouseSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList } from "lucide-react";
import {
  getSessionTypeCardClasses,
  shouldShowSupplementalBadge,
} from "@/lib/session-type-styles";
import { getQuadrantInfo } from "@/lib/quadrants";
import type { Activity, Goal } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROW_HEIGHT_PX = 64; // default / max row height when space allows
export const MIN_ROW_HEIGHT_PX = 32; // floor — keeps title readable at one hour per row
export const FULL_DAY_START_MINUTES = 6 * 60; // 6:00 AM
export const FULL_DAY_END_MINUTES = 24 * 60; // midnight (end of day)
/** Padding below the timeline within the schedule card. */
export const TIMELINE_BOTTOM_MARGIN_PX = 16;

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function minutesToHourLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const ampm = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${ampm}`;
}

export function computeRowHeightPx(
  availableHeightPx: number,
  hourCount: number,
  minRowHeightPx = MIN_ROW_HEIGHT_PX,
  maxRowHeightPx = ROW_HEIGHT_PX
): number {
  if (hourCount <= 0 || availableHeightPx <= 0) return maxRowHeightPx;
  const fitted = Math.floor(availableHeightPx / hourCount);
  return Math.max(minRowHeightPx, Math.min(maxRowHeightPx, fitted));
}

export function computeActivityPosition(
  activity: Activity,
  visibleStartMinutes: number,
  rowHeightPx: number = ROW_HEIGHT_PX
): { top: number; height: number } {
  const startMin = timeToMinutes(activity.startTime);
  const endMin = timeToMinutes(activity.endTime);
  const durationMin = endMin > startMin ? endMin - startMin : 60;
  const minCardHeight = Math.min(24, rowHeightPx * 0.75);
  return {
    top: ((startMin - visibleStartMinutes) / 60) * rowHeightPx,
    height: Math.max(minCardHeight, (durationMin / 60) * rowHeightPx),
  };
}

export function groupOverlappingActivities(activities: Activity[]): Activity[][] {
  const sorted = [...activities].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
  const groups: Activity[][] = [];

  for (const activity of sorted) {
    const aStart = timeToMinutes(activity.startTime);
    const aEndRaw = timeToMinutes(activity.endTime);
    const aEnd = aEndRaw > aStart ? aEndRaw : aStart + 60;

    let placed = false;
    for (const group of groups) {
      const overlapsGroup = group.some((g) => {
        const gStart = timeToMinutes(g.startTime);
        const gEndRaw = timeToMinutes(g.endTime);
        const gEnd = gEndRaw > gStart ? gEndRaw : gStart + 60;
        return aStart < gEnd && gStart < aEnd;
      });
      if (overlapsGroup) {
        group.push(activity);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([activity]);
  }

  return groups;
}

/**
 * Translates a drag delta (px) into a snapped minute offset.
 * Returns `valid: false` if the drag would push the activity past midnight.
 */
export function computeDragOffset(
  deltaY: number,
  originalStartMinutes: number,
  durationMinutes: number,
  rowHeightPx: number = ROW_HEIGHT_PX
): { offsetMinutes: number; valid: boolean } {
  const snapMinutes = 30;
  const rawOffset = (deltaY / rowHeightPx) * 60;
  const snapped = Math.round(rawOffset / snapMinutes) * snapMinutes;
  const newStart = Math.max(0, Math.min(23 * 60 + 30, originalStartMinutes + snapped));
  const newEnd = newStart + durationMinutes;
  if (newEnd > 24 * 60) return { offsetMinutes: 0, valid: false };
  return { offsetMinutes: newStart - originalStartMinutes, valid: true };
}

// ─── DailyActivityCard ────────────────────────────────────────────────────────

interface DailyActivityCardProps {
  activity: Activity;
  goals: Goal[];
  onToggle: (id: number, checked: boolean) => void;
  onEdit: (activity: Activity) => void;
  onLogAndComplete: (activityTypeId: number, activityId: number) => void;
  relative?: boolean;
}

function DailyActivityCard({
  activity,
  goals,
  onToggle,
  onEdit,
  onLogAndComplete,
  relative = false,
}: DailyActivityCardProps) {
  const sessionType = activity.sessionType ?? "training";
  const showSupplementalBadge = shouldShowSupplementalBadge(sessionType);
  const quadrant = getQuadrantInfo(activity.quadrant);
  const effectiveActivityTypeId =
    activity.activityTypeId ??
    goals.find((g) => g.id === activity.goalId)?.activityTypeId ??
    null;
  const canLogAndComplete = !activity.isCompleted && effectiveActivityTypeId != null;

  return (
    <div
      className={cn(
        "group h-full rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden",
        getSessionTypeCardClasses(sessionType),
        activity.isCompleted && "opacity-50",
        relative ? "p-3" : "p-2"
      )}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: activity.roleColor ?? quadrant.hexColor,
      }}
      onClick={() => onEdit(activity)}
    >
      {showSupplementalBadge && (
        <Badge
          variant="secondary"
          className="absolute right-1 top-1 text-[9px] font-normal z-20"
        >
          Supp
        </Badge>
      )}
      <div className="flex items-start gap-1.5 h-full">
        <Checkbox
          checked={activity.isCompleted}
          onCheckedChange={(checked) => onToggle(activity.id, checked as boolean)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          <p
            className={cn(
              "text-xs font-medium leading-tight truncate",
              activity.isCompleted && "line-through"
            )}
          >
            {activity.title}
          </p>
        </div>
        {canLogAndComplete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Log & Complete"
            onClick={(e) => {
              e.stopPropagation();
              onLogAndComplete(effectiveActivityTypeId!, activity.id);
            }}
          >
            <ClipboardList className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── DraggableActivityWrapper ─────────────────────────────────────────────────

interface DraggableActivityWrapperProps {
  activity: Activity;
  goals: Goal[];
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  hasError: boolean;
  rowHeightPx: number;
  onToggle: (id: number, checked: boolean) => void;
  onEdit: (activity: Activity) => void;
  onLogAndComplete: (activityTypeId: number, activityId: number) => void;
}

function DraggableActivityWrapper({
  activity,
  goals,
  top,
  height,
  leftPct,
  widthPct,
  hasError,
  rowHeightPx,
  onToggle,
  onEdit,
  onLogAndComplete,
}: DraggableActivityWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: activity.id.toString(),
    disabled: activity.isCompleted,
  });

  // Derive snapped label directly from useDraggable's own transform — avoids
  // a parent state update (and full-tree re-render) on every mousemove event.
  const snappedOffsetMin = isDragging
    ? Math.round(((transform?.y ?? 0) / rowHeightPx) * 60 / 30) * 30
    : 0;
  const startMin = timeToMinutes(activity.startTime);
  const snappedStartMin = Math.max(0, Math.min(23 * 60 + 30, startMin + snappedOffsetMin));

  const posStyle: React.CSSProperties = {
    position: "absolute",
    top,
    height,
    left: `${leftPct}%`,
    width: `calc(${widthPct}% - 2px)`,
    zIndex: isDragging ? 100 : 10,
    transform: transform ? `translate(0px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.9 : 1,
    touchAction: "none",
  };

  return (
    <>
      {/* Ghost at original slot while dragging */}
      {isDragging && (
        <div
          className="absolute rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20"
          style={{
            top,
            height,
            left: `${leftPct}%`,
            width: `calc(${widthPct}% - 2px)`,
            zIndex: 5,
          }}
        />
      )}

      <div
        ref={setNodeRef}
        className="px-0.5"
        style={posStyle}
        {...(!activity.isCompleted ? listeners : {})}
        {...(!activity.isCompleted ? attributes : {})}
      >
        <DailyActivityCard
          activity={activity}
          goals={goals}
          onToggle={onToggle}
          onEdit={onEdit}
          onLogAndComplete={onLogAndComplete}
        />

        {/* Floating time label during drag */}
        {isDragging && (
          <div className="absolute -top-6 left-0 z-50 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium shadow-sm whitespace-nowrap pointer-events-none">
            {minutesToTimeString(snappedStartMin)}
          </div>
        )}

        {/* Inline error after failed reschedule */}
        {hasError && (
          <div className="absolute -bottom-5 left-0 z-50 text-[10px] text-destructive whitespace-nowrap pointer-events-none">
            Could not reschedule — reverted
          </div>
        )}
      </div>
    </>
  );
}

// ─── TimelineSurface (Droppable) ──────────────────────────────────────────────

function TimelineSurface({
  hours,
  rowHeightPx,
  onAdd,
  children,
}: {
  hours: number[];
  rowHeightPx: number;
  onAdd: (startTime: string) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: "timeline" });

  return (
    <div ref={setNodeRef} className="relative flex-1 border-l border-border/30">
      {/* Hour grid lines */}
      {hours.map((hour, i) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-border/20 cursor-pointer hover:bg-accent/20 transition-colors"
          style={{ top: i * rowHeightPx, height: rowHeightPx }}
          onClick={() => onAdd(`${String(hour).padStart(2, "0")}:00`)}
        />
      ))}
      {children}
    </div>
  );
}

// ─── HourlyTimeline ───────────────────────────────────────────────────────────

export interface HourlyTimelineProps {
  activities: Activity[];
  goals: Goal[];
  onToggle: (id: number, checked: boolean) => void;
  onEdit: (activity: Activity) => void;
  onAdd: (startTime: string) => void;
  onLogAndComplete: (activityTypeId: number, activityId: number) => void;
  /**
   * Called when the user drags an activity to a new time slot.
   * Should PATCH /api/activities/:id with the new startTime and endTime.
   * Throw (or return a rejected promise) on failure so the timeline can revert.
   */
  onReschedule: (id: number, startTime: string, endTime: string) => Promise<void>;
}

export function HourlyTimeline({
  activities,
  goals,
  onToggle,
  onEdit,
  onAdd,
  onLogAndComplete,
  onReschedule,
}: HourlyTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeightPx, setRowHeightPx] = useState(ROW_HEIGHT_PX);

  // Optimistic time overrides: activityId → { startTime, endTime }
  const [timeOverrides, setTimeOverrides] = useState<
    Map<number, { startTime: string; endTime: string }>
  >(new Map());
  // ID of the activity whose last reschedule failed (shows inline error)
  const [rescheduleErrorId, setRescheduleErrorId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } })
  );

  // Apply optimistic time overrides before computing layout
  const resolvedActivities = useMemo(
    () =>
      activities.map((a) => {
        const ov = timeOverrides.get(a.id);
        return ov ? { ...a, ...ov } : a;
      }),
    [activities, timeOverrides]
  );

  const timelineActivities = resolvedActivities.filter((a) => !a.createdFromLog);
  const loggedActivities = resolvedActivities.filter((a) => a.createdFromLog);

  const startMinutes = FULL_DAY_START_MINUTES;
  const endMinutes = FULL_DAY_END_MINUTES;
  const startHour = Math.floor(startMinutes / 60);
  const endHour = Math.ceil(endMinutes / 60);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const totalHeight = hours.length * rowHeightPx;

  const groups = groupOverlappingActivities(timelineActivities);
  const columnInfo = new Map<number, { columnIndex: number; columnCount: number }>();
  for (const group of groups) {
    group.forEach((activity, index) => {
      columnInfo.set(activity.id, { columnIndex: index, columnCount: group.length });
    });
  }

  // Scale row height so the full day fits in the remaining viewport — no scroll.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateRowHeight() {
      const top = el!.getBoundingClientRect().top;
      const available = window.innerHeight - top - TIMELINE_BOTTOM_MARGIN_PX;
      setRowHeightPx(computeRowHeightPx(available, hours.length));
    }

    updateRowHeight();
    const observer = new ResizeObserver(updateRowHeight);
    observer.observe(el);
    // Also observe the parent so carry-forward / header changes above shift .top
    const layoutParent = el.parentElement;
    if (layoutParent) observer.observe(layoutParent);
    window.addEventListener("resize", updateRowHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateRowHeight);
    };
  }, [hours.length]);

  async function handleDragEnd({ active, delta }: DragEndEvent) {
    const activityId = Number(active.id);
    // Use original (non-overridden) times for computing the offset
    const original = activities.find((a) => a.id === activityId);
    if (!original) return;

    const startMin = timeToMinutes(original.startTime);
    const endMin = timeToMinutes(original.endTime);
    const durationMin = endMin > startMin ? endMin - startMin : 60;

    const { offsetMinutes, valid } = computeDragOffset(
      delta.y,
      startMin,
      durationMin,
      rowHeightPx
    );
    if (!valid || offsetMinutes === 0) return;

    const newStartTime = minutesToTimeString(startMin + offsetMinutes);
    const newEndTime = minutesToTimeString(startMin + offsetMinutes + durationMin);

    // Optimistically position the card at the new time
    setTimeOverrides((prev) =>
      new Map(prev).set(activityId, { startTime: newStartTime, endTime: newEndTime })
    );

    try {
      await onReschedule(activityId, newStartTime, newEndTime);
    } catch {
      setTimeOverrides((prev) => {
        const next = new Map(prev);
        next.delete(activityId);
        return next;
      });
      setRescheduleErrorId(activityId);
      setTimeout(() => setRescheduleErrorId(null), 3000);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      {/* Full-day timeline — row height scales to fit the remaining viewport */}
      <div ref={containerRef} className="overflow-hidden" style={{ height: totalHeight }}>
        <div className="relative flex" style={{ height: totalHeight }}>
          {/* Time label column */}
          <div className="w-12 shrink-0 select-none" aria-hidden="true">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end pr-2"
                style={{ height: rowHeightPx, paddingTop: 2 }}
              >
                <span className="text-[10px] text-muted-foreground/60 leading-none">
                  {minutesToHourLabel(hour * 60)}
                </span>
              </div>
            ))}
          </div>

          {/* Droppable activity surface */}
          <TimelineSurface hours={hours} rowHeightPx={rowHeightPx} onAdd={onAdd}>
            {timelineActivities.map((activity) => {
              const { top, height } = computeActivityPosition(
                activity,
                startMinutes,
                rowHeightPx
              );
              const info = columnInfo.get(activity.id) ?? {
                columnIndex: 0,
                columnCount: 1,
              };
              const widthPct = 100 / info.columnCount;
              const leftPct = widthPct * info.columnIndex;

              return (
                <DraggableActivityWrapper
                  key={activity.id}
                  activity={activity}
                  goals={goals}
                  top={top}
                  height={height}
                  leftPct={leftPct}
                  widthPct={widthPct}
                  hasError={rescheduleErrorId === activity.id}
                  rowHeightPx={rowHeightPx}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onLogAndComplete={onLogAndComplete}
                />
              );
            })}
          </TimelineSurface>
        </div>
      </div>

      {/* Logged activities — created from log entries, no fixed time slot */}
      {loggedActivities.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground/70 uppercase tracking-wide pl-12">
            Logged
          </p>
          {loggedActivities.map((activity) => (
            <div key={activity.id} className="pl-12">
              <DailyActivityCard
                activity={activity}
                goals={goals}
                onToggle={onToggle}
                onEdit={onEdit}
                onLogAndComplete={onLogAndComplete}
                relative
              />
            </div>
          ))}
        </div>
      )}
    </DndContext>
  );
}
