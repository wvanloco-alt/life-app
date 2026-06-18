"use client";

import { useState, useEffect, useRef } from "react";
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
    return e > s ? e : s + 60; // treat inverted/zero-duration as 1 hr
  });
  return {
    startMinutes: Math.max(6 * 60, Math.min(...starts) - 60), // floor at 06:00
    endMinutes: Math.min(22 * 60, Math.max(...ends) + 60),    // ceiling at 22:00
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

/**
 * Groups activities that overlap in time. Each returned sub-array contains
 * activities that share at least one overlapping neighbour and should be
 * rendered side-by-side. Singleton groups are non-overlapping activities.
 */
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

// ─── DailyActivityCard ────────────────────────────────────────────────────────

interface DailyActivityCardProps {
  activity: Activity;
  goals: Goal[];
  onToggle: (id: number, checked: boolean) => void;
  onEdit: (activity: Activity) => void;
  onLogAndComplete: (activityTypeId: number, activityId: number) => void;
  /** When true the card fills its parent via a plain div (used in the Logged section). */
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
        "group rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden",
        getSessionTypeCardClasses(sessionType),
        activity.isCompleted && "opacity-50",
        relative ? "p-3" : "absolute inset-0 p-2"
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

// ─── HourlyTimeline ───────────────────────────────────────────────────────────

export interface HourlyTimelineProps {
  activities: Activity[];
  goals: Goal[];
  /** Called when the user checks or unchecks an activity. */
  onToggle: (id: number, checked: boolean) => void;
  /** Called when the user clicks on an activity card to edit it. */
  onEdit: (activity: Activity) => void;
  /** Called when the user clicks an empty hour slot. `startTime` is "HH:MM". */
  onAdd: (startTime: string) => void;
  /** Called when the user clicks the Log & Complete icon on a card. */
  onLogAndComplete: (activityTypeId: number, activityId: number) => void;
}

export function HourlyTimeline({
  activities,
  goals,
  onToggle,
  onEdit,
  onAdd,
  onLogAndComplete,
}: HourlyTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Split: activities with a meaningful time slot vs those created from logs
  const timelineActivities = activities.filter((a) => !a.createdFromLog);
  const loggedActivities = activities.filter((a) => a.createdFromLog);

  const { startMinutes, endMinutes } = computeVisibleRange(timelineActivities);
  const startHour = Math.floor(startMinutes / 60);
  const endHour = Math.ceil(endMinutes / 60);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const totalHeight = hours.length * ROW_HEIGHT_PX;

  // Column layout for overlapping activities
  const groups = groupOverlappingActivities(timelineActivities);
  const columnInfo = new Map<number, { columnIndex: number; columnCount: number }>();
  for (const group of groups) {
    group.forEach((activity, index) => {
      columnInfo.set(activity.id, { columnIndex: index, columnCount: group.length });
    });
  }

  // Scroll so the current hour (minus 1) is at the top on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const currentHour = new Date().getHours();
    const earliestHour =
      timelineActivities.length > 0
        ? Math.floor(Math.min(...timelineActivities.map((a) => timeToMinutes(a.startTime))) / 60)
        : currentHour;
    const targetHour = Math.max(currentHour - 1, earliestHour - 1);
    const clampedHour = Math.max(startHour, Math.min(endHour - 1, targetHour));
    scrollRef.current.scrollTop = (clampedHour - startHour) * ROW_HEIGHT_PX;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  return (
    <div>
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

          {/* Activity surface */}
          <div className="relative flex-1 border-l border-border/30">
            {/* Hour grid lines — clickable to open Add Activity pre-filled with that slot */}
            {hours.map((hour, i) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-border/20 cursor-pointer hover:bg-accent/20 transition-colors"
                style={{ top: i * ROW_HEIGHT_PX, height: ROW_HEIGHT_PX }}
                onClick={() =>
                  onAdd(`${String(hour).padStart(2, "0")}:00`)
                }
              />
            ))}

            {/* Activity cards */}
            {timelineActivities.map((activity) => {
              const { top, height } = computeActivityPosition(activity, startMinutes);
              const info = columnInfo.get(activity.id) ?? {
                columnIndex: 0,
                columnCount: 1,
              };
              const widthPct = 100 / info.columnCount;
              const leftPct = widthPct * info.columnIndex;

              return (
                <div
                  key={activity.id}
                  className="absolute px-0.5"
                  style={{
                    top,
                    height,
                    left: `${leftPct}%`,
                    width: `calc(${widthPct}% - 2px)`,
                    zIndex: 10,
                  }}
                >
                  <DailyActivityCard
                    activity={activity}
                    goals={goals}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onLogAndComplete={onLogAndComplete}
                  />
                </div>
              );
            })}
          </div>
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
    </div>
  );
}
