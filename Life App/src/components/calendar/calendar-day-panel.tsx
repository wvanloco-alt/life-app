"use client";

import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { ActivityMark } from "@/components/calendar/activity-mark";
import { usePalette } from "@/hooks/use-palette";
import type { PaletteColor } from "@/lib/palette";
import { brusselsToday } from "@/lib/dates";
import type { CalendarActivity, CalendarDayCompletion } from "@/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarDayPanelProps {
  date: string;
  activities: CalendarActivity[];
  completions: CalendarDayCompletion[];
  onToggle: (activityTypeId: number, checked: boolean) => Promise<void>;
}

const NAMED_CELEBRATIONS: Record<string, string> = {
  Running: "sweep",
  Hiking: "rise",
  Tennis: "bloom",
  "Climbing (Gym)": "climb",
  "Climbing (Outdoor)": "peak",
  Reading: "open",
  Meditation: "still",
  Journaling: "ink",
  "Social Event": "gather",
};

const FALLBACK_CELEBRATIONS = ["sweep", "rise", "bloom", "climb", "still", "ink", "gather", "open", "peak"];

function celebrationFor(activity: CalendarActivity): string {
  return NAMED_CELEBRATIONS[activity.name] ?? FALLBACK_CELEBRATIONS[activity.id % FALLBACK_CELEBRATIONS.length];
}

function Celebration({ kind, color }: { kind: string; color: string }) {
  if (kind === "sweep") {
    return (
      <span
        className="calendar-celebrate-motion pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-lg"
        style={{ backgroundColor: color, animation: "calendar-sweep 700ms var(--ease-out-quart) both" }}
      />
    );
  }
  if (kind === "rise") {
    return (
      <span
        className="calendar-celebrate-motion pointer-events-none absolute left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md"
        style={{ backgroundColor: color, animation: "calendar-rise 700ms var(--ease-out-quart) both" }}
      />
    );
  }
  if (kind === "bloom" || kind === "open") {
    return (
      <span
        className="calendar-celebrate-motion pointer-events-none absolute left-6 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: color, animation: "calendar-bloom 650ms var(--ease-out-quart) both" }}
      />
    );
  }
  if (kind === "climb" || kind === "peak") {
    return (
      <span
        className="calendar-celebrate-motion pointer-events-none absolute left-3 top-1/2 h-7 w-7 -translate-y-1/2 rounded-sm"
        style={{
          backgroundColor: color,
          animation: "calendar-rise 800ms var(--ease-out-quart) both",
          borderRadius: kind === "peak" ? "999px 999px 2px 2px" : undefined,
        }}
      />
    );
  }
  if (kind === "still") {
    return (
      <span
        className="calendar-celebrate-motion pointer-events-none absolute left-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-2"
        style={{ borderColor: color, animation: "calendar-ring 900ms var(--ease-out-quart) both" }}
      />
    );
  }
  if (kind === "ink") {
    return (
      <span
        className="calendar-celebrate-motion pointer-events-none absolute bottom-1 left-3 right-3 h-0.5 origin-left"
        style={{ backgroundColor: color, animation: "calendar-ink 600ms var(--ease-out-quart) both" }}
      />
    );
  }
  return (
    <>
      <span
        className="calendar-celebrate-motion pointer-events-none absolute left-8 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: color, animation: "calendar-ripple 700ms var(--ease-out-quart) both" }}
      />
      <span
        className="calendar-celebrate-motion pointer-events-none absolute left-8 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: color, animation: "calendar-ripple 700ms var(--ease-out-quart) 120ms both" }}
      />
    </>
  );
}

export function CalendarDayPanel({
  date,
  activities,
  completions,
  onToggle,
}: CalendarDayPanelProps) {
  const palette = usePalette();
  const today = brusselsToday();
  const isFuture = date > today;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [celebratingId, setCelebratingId] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const completionMap = useMemo(() => {
    const map = new Map<number, CalendarDayCompletion>();
    for (const c of completions) map.set(c.activityTypeId, c);
    return map;
  }, [completions]);

  const ordered = useMemo(() => {
    return activities
      .filter((a) => a.visible)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activities]);

  const heading = format(parseISO(date), "EEEE, MMMM d");

  if (ordered.length === 0) {
    return (
      <div className="rounded-[0.625rem] border border-border/60 bg-card p-6">
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold">{heading}</p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Every activity is hidden. Open Configure and show at least one activity to start checking off your days.
        </p>
      </div>
    );
  }

  async function handleToggle(activityId: number, next: boolean) {
    setError(null);
    if (next && !reduceMotion) {
      setCelebratingId(activityId);
      window.setTimeout(() => {
        setCelebratingId((current) => (current === activityId ? null : current));
      }, 900);
    }
    setPending((s) => new Set(s).add(activityId));
    try {
      await onToggle(activityId, next);
    } catch {
      setCelebratingId((current) => (current === activityId ? null : current));
      setError("Could not save. Try again.");
    } finally {
      setPending((s) => {
        const n = new Set(s);
        n.delete(activityId);
        return n;
      });
    }
  }

  return (
    <div className="rounded-[0.625rem] border border-border/60 bg-card p-6 space-y-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">{heading}</h2>

      {isFuture && (
        <p className="text-sm text-muted-foreground">Future days cannot be checked yet.</p>
      )}

      <ul className="space-y-2">
        {ordered.map((activity) => {
          const completion = completionMap.get(activity.id);
          const checked = Boolean(completion);
          const locked = completion?.locked ?? false;
          const disabled = isFuture || locked || pending.has(activity.id);
          const color = palette.color(activity.color as PaletteColor);
          const celebrating = !reduceMotion && celebratingId === activity.id;

          return (
            <li
              key={activity.id}
              className={cn(
                "relative flex items-center justify-between gap-4 overflow-hidden rounded-lg border border-border/40 px-3 py-2.5",
                celebrating && "calendar-celebrate-icon"
              )}
              style={celebrating ? { animation: "calendar-lift 500ms var(--ease-out-quart)" } : undefined}
            >
              {celebrating && <Celebration kind={celebrationFor(activity)} color={color} />}
              <div className="relative flex items-center gap-3 min-w-0">
                <ActivityMark activity={activity} size="sm" className="w-8" />
                <span className="text-sm font-medium truncate">{activity.name}</span>
              </div>
              <div className="relative flex flex-col items-end gap-1">
                <Switch
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) => void handleToggle(activity.id, value)}
                />
                {locked && (
                  <span className="text-[11px] text-muted-foreground max-w-[12rem] text-right leading-snug">
                    Logged in detail or from Garmin — cannot remove from here
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
