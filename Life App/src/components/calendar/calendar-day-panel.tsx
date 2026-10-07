"use client";

import { useEffect, useMemo, useState } from "react";
import { usePalette } from "@/hooks/use-palette";
import { celebrationEmojiCharacter } from "@/lib/celebration-emojis";
import { getLucideIcon } from "@/lib/icons";
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
  const [celebration, setCelebration] = useState<{
    activityId: number;
    character: string;
  } | null>(null);
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

  function clearCelebration() {
    setCelebration(null);
  }

  async function handleToggle(activity: CalendarActivity, currentlyChecked: boolean) {
    const next = !currentlyChecked;
    setError(null);
    if (!next) clearCelebration();

    setPending((s) => new Set(s).add(activity.id));
    try {
      await onToggle(activity.id, next);
      if (next && activity.celebration) {
        const character = celebrationEmojiCharacter(activity.celebration);
        if (character) {
          setCelebration({ activityId: activity.id, character });
          window.setTimeout(() => {
            setCelebration((current) =>
              current?.activityId === activity.id ? null : current
            );
          }, 1300);
        }
      }
    } catch {
      clearCelebration();
      setError("Could not save. Try again.");
    } finally {
      setPending((s) => {
        const n = new Set(s);
        n.delete(activity.id);
        return n;
      });
    }
  }

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
          const busy = pending.has(activity.id);
          const canEdit = !isFuture && !locked && !busy;
          const color = palette.color(activity.color as PaletteColor);
          const Icon = getLucideIcon(activity.icon);
          const showEmoji =
            celebration?.activityId === activity.id && celebration.character;

          if (locked) {
            return (
              <li
                key={activity.id}
                className="relative flex flex-col gap-1 rounded-lg px-3 py-2.5 text-white"
                style={{ backgroundColor: color }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {Icon ? (
                    <Icon className="h-4 w-4 shrink-0 text-white" aria-hidden />
                  ) : (
                    <span className="text-sm font-semibold">{activity.name.slice(0, 1)}</span>
                  )}
                  <span className="text-sm font-medium truncate">{activity.name}</span>
                </div>
                <span className="text-[11px] text-white/85 leading-snug pl-7">
                  Logged in detail or from Garmin — cannot remove from here
                </span>
              </li>
            );
          }

          return (
            <li key={activity.id} className="relative">
              <button
                type="button"
                disabled={!canEdit}
                aria-pressed={checked}
                onClick={() => void handleToggle(activity, checked)}
                onKeyDown={(e) => {
                  if (!canEdit) {
                    if (e.key === "Enter" || e.key === " ") e.preventDefault();
                    return;
                  }
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void handleToggle(activity, checked);
                  }
                }}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  checked
                    ? "text-white shadow-sm"
                    : "border border-border/40 bg-transparent hover:bg-muted/40",
                  !canEdit && !checked && "opacity-60 cursor-not-allowed",
                  canEdit && "cursor-pointer"
                )}
                style={checked ? { backgroundColor: color } : undefined}
              >
                {checked ? (
                  Icon ? (
                    <Icon className="h-4 w-4 shrink-0 text-white" aria-hidden />
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {activity.name.slice(0, 1)}
                    </span>
                  )
                ) : Icon ? (
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/30 bg-card"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" style={{ color }} />
                  </span>
                ) : (
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/30 text-sm font-semibold"
                    style={{ color }}
                    aria-hidden
                  >
                    {activity.name.slice(0, 1)}
                  </span>
                )}
                <span
                  className={cn(
                    "text-sm font-medium truncate",
                    checked ? "text-white" : "text-foreground"
                  )}
                >
                  {activity.name}
                </span>
              </button>
              {showEmoji && (
                <span
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-full z-10 -translate-x-1/2 text-2xl",
                    reduceMotion ? "calendar-emoji-fade" : "calendar-emoji-rise"
                  )}
                  aria-hidden
                >
                  {celebration.character}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
