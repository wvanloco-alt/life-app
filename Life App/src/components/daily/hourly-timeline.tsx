"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  MouseSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList } from "lucide-react";
import { formatTime } from "@/lib/dates";
import {
  getSessionTypeCardClasses,
  shouldShowSupplementalBadge,
} from "@/lib/session-type-styles";
import { getQuadrantInfo } from "@/lib/quadrants";
import type { Activity, Goal } from "@/types";

// ─── NotesPreview ─────────────────────────────────────────────────────────────

function NotesPreview({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const firstLine = notes.split("\n")[0];
  const isLong = notes.length > 120 || notes.includes("\n\n");

  if (!isLong) {
    return <p className="text-[10px] text-muted-foreground mt-0.5">{notes}</p>;
  }

  return (
    <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
      {expanded ? (
        <div className="text-[10px] text-muted-foreground space-y-1">
          {notes.split("\n\n").map((block, i) => (
            <p key={i} className="leading-relaxed">{block}</p>
          ))}
          <button
            className="text-primary hover:underline"
            onClick={() => setExpanded(false)}
          >
            Show less
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          <span className="line-clamp-1">{firstLine}</span>
          <button
            className="text-primary hover:underline ml-1"
            onClick={() => setExpanded(true)}
          >
            Show more
          </button>
        </p>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROW_HEIGHT_PX = 64; // 1 hour = 64 px

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

/**
 * Computes the visible hour range for the timeline.
 * Expects only activities with `createdFromLog === false` (i.e. those with
 * meaningful startTime/endTime). Passing unfiltered activities may skew the
 * range if log-created entries carry synthetic or zero-duration times.
 */
export function computeVisibleRange(
  activities: Activity[]
): { startMinutes: number; endMinutes: number } {
  if (activities.length === 0) {
    return { startMinutes: 7 * 60, endMinutes: 20 * 60 }; // 07:00–20:00 default
  }
  const starts = activities.map((a) => timeToMinutes(a.startTime));
  const ends = activities.map((a) => {
    const s = timeToMinutes(a.startTime);
    const e = timeToMinutes(a.endTime);
    return e > s ? e : s + 60;
  });
  return {
    startMinutes: Math.max(6 * 60, Math.min(...starts) - 60),
    endMinutes: Math.min(22 * 60, Math.max(...ends) + 60),
  };
}

export function computeActivityPosition(
  activity: Activity,
  visibleStartMinutes: number
): { top: number; height: number } {
  const startMin = timeToMinutes(activity.startTime);
  const endMin = timeToMinutes(activity.endTime);
  const durationMin = endMin > startMin ? endMin - startMin : 60;
  return {
    top: ((startMin - visibleStartMinutes) / 60) * ROW_HEIGHT_PX,
    height: Math.max(24, (durationMin / 60) * ROW_HEIGHT_PX),
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
  durationMinutes: number
): { offsetMinutes: number; valid: boolean } {
  const snapMinutes = 30;
  const rawOffset = (deltaY / ROW_HEIGHT_PX) * 60;
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
          <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
            {formatTime(activity.startTime)} – {formatTime(activity.endTime)}
          </p>
          {activity.roleName && (
            <p
              className="text-[10px] mt-0.5 truncate"
              style={{ color: activity.roleColor ?? undefined }}
            >
              {activity.roleName}
            </p>
          )}
          {activity.notes && <NotesPreview notes={activity.notes} />}
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
  isActive: boolean;
  activeTransformY: number;
  hasError: boolean;
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
  isActive,
  activeTransformY,
  hasError,
  onToggle,
  onEdit,
  onLogAndComplete,
}: DraggableActivityWrapperProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: activity.id.toString(),
    disabled: activity.isCompleted,
  });

  // Compute snapped start time for floating label
  const snappedOffsetMin = isActive
    ? Math.round(((activeTransformY / ROW_HEIGHT_PX) * 60) / 30) * 30
    : 0;
  const startMin = timeToMinutes(activity.startTime);
  const snappedStartMin = Math.max(0, Math.min(23 * 60 + 30, startMin + snappedOffsetMin));

  const posStyle: React.CSSProperties = {
    position: "absolute",
    top,
    height,
    left: `${leftPct}%`,
    width: `calc(${widthPct}% - 2px)`,
    zIndex: isActive ? 100 : 10,
    transform: transform ? `translate(0px, ${transform.y}px)` : undefined,
    opacity: isActive ? 0.9 : 1,
    touchAction: "none",
  };

  return (
    <>
      {/* Ghost at original slot while dragging */}
      {isActive && (
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
        {isActive && (
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
  totalHeight,
  onAdd,
  children,
}: {
  hours: number[];
  totalHeight: number;
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
          style={{ top: i * ROW_HEIGHT_PX, height: ROW_HEIGHT_PX }}
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
  onReschedule?: (id: number, startTime: string, endTime: string) => Promise<void>;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTransformY, setActiveTransformY] = useState(0);
  // Optimistic time overrides: activityId → { startTime, endTime }
  const [timeOverrides, setTimeOverrides] = useState<
    Map<number, { startTime: string; endTime: string }>
  >(new Map());
  // ID of the activity whose last reschedule failed (shows inline error)
  const [rescheduleErrorId, setRescheduleErrorId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } })
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

  const { startMinutes, endMinutes } = computeVisibleRange(timelineActivities);
  const startHour = Math.floor(startMinutes / 60);
  const endHour = Math.ceil(endMinutes / 60);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const totalHeight = hours.length * ROW_HEIGHT_PX;

  const groups = groupOverlappingActivities(timelineActivities);
  const columnInfo = new Map<number, { columnIndex: number; columnCount: number }>();
  for (const group of groups) {
    group.forEach((activity, index) => {
      columnInfo.set(activity.id, { columnIndex: index, columnCount: group.length });
    });
  }

  // Scroll to current hour on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const currentHour = new Date().getHours();
    const earliestHour =
      timelineActivities.length > 0
        ? Math.floor(
            Math.min(...timelineActivities.map((a) => timeToMinutes(a.startTime))) / 60
          )
        : currentHour;
    const targetHour = Math.max(currentHour - 1, earliestHour - 1);
    const clampedHour = Math.max(startHour, Math.min(endHour - 1, targetHour));
    scrollRef.current.scrollTop = (clampedHour - startHour) * ROW_HEIGHT_PX;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id.toString());
    setActiveTransformY(0);
  }

  function handleDragMove({ delta }: DragMoveEvent) {
    setActiveTransformY(delta.y);
  }

  async function handleDragEnd({ active, delta }: DragEndEvent) {
    setActiveId(null);
    setActiveTransformY(0);

    const activityId = Number(active.id);
    // Use original (non-overridden) times for computing the offset
    const original = activities.find((a) => a.id === activityId);
    if (!original || !onReschedule) return;

    const startMin = timeToMinutes(original.startTime);
    const endMin = timeToMinutes(original.endTime);
    const durationMin = endMin > startMin ? endMin - startMin : 60;

    const { offsetMinutes, valid } = computeDragOffset(delta.y, startMin, durationMin);
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

  function handleDragCancel() {
    setActiveId(null);
    setActiveTransformY(0);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Scrollable timeline */}
      <div ref={scrollRef} className="overflow-y-auto max-h-[560px]">
        <div className="relative flex" style={{ height: totalHeight }}>
          {/* Time label column */}
          <div className="w-12 shrink-0 select-none" aria-hidden="true">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end pr-2"
                style={{ height: ROW_HEIGHT_PX, paddingTop: 2 }}
              >
                <span className="text-[10px] text-muted-foreground/60 leading-none">
                  {minutesToHourLabel(hour * 60)}
                </span>
              </div>
            ))}
          </div>

          {/* Droppable activity surface */}
          <TimelineSurface
            hours={hours}
            totalHeight={totalHeight}
            onAdd={onAdd}
          >
            {timelineActivities.map((activity) => {
              const { top, height } = computeActivityPosition(activity, startMinutes);
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
                  isActive={activeId === activity.id.toString()}
                  activeTransformY={activeTransformY}
                  hasError={rescheduleErrorId === activity.id}
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
