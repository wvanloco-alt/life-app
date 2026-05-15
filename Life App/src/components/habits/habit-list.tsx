"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { HabitWithRecentLogs } from "@/types";
import { Repeat } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { HabitForm } from "./habit-form";
import { HabitRow } from "./habit-row";

const AFFIRMATIONS = [
  "That's the streak.",
  "One more vote for the identity.",
  "Done. That's who you are.",
  "Present.",
  "Habit honored.",
  "Another day, another rep.",
  "Consistent.",
];

function pickAffirmation(minimumVersion?: string | null): string {
  if (minimumVersion) return minimumVersion;
  return AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
}

/** Returns YYYY-MM-DD for the client's local today — never touches a server. */
function getLocalToday(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function HabitList() {
  const [habits, setHabits] = useState<HabitWithRecentLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [today] = useState<string>(getLocalToday);

  // Per-habit log dates (source of truth for the strip)
  const [logDates, setLogDates] = useState<Record<number, string[]>>({});

  // Per-cell in-flight keys: "habitId:date"
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());

  // Per-habit transient messages (affirmation or error)
  const [affirmations, setAffirmations] = useState<Record<number, string | null>>({});
  const [errors, setErrors] = useState<Record<number, string | null>>({});

  // Form state
  const [formMode, setFormMode] = useState<"quick" | "walkthrough" | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchHabits() {
      try {
        const res = await fetch("/api/habits");
        if (!res.ok) throw new Error("Failed to load habits");
        const data: HabitWithRecentLogs[] = await res.json();
        if (cancelled) return;
        setHabits(data);
        // Bootstrap logDates from API response
        const initial: Record<number, string[]> = {};
        for (const h of data) initial[h.id] = h.recentLogDates;
        setLogDates(initial);
      } catch {
        if (!cancelled) setFetchError("Could not load habits. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHabits();
    return () => { cancelled = true; };
  }, []);

  // ── Toggle ─────────────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    async (habitId: number, date: string) => {
      const key = `${habitId}:${date}`;
      if (inFlight.has(key)) return;

      const current = logDates[habitId] ?? [];
      const alreadyLogged = current.includes(date);

      // Optimistic update
      setLogDates((prev) => {
        const dates = prev[habitId] ?? [];
        return {
          ...prev,
          [habitId]: alreadyLogged
            ? dates.filter((d) => d !== date)
            : [...dates, date].sort(),
        };
      });

      setInFlight((prev) => new Set([...prev, key]));

      // Inline affirmation when filling today's cell
      if (!alreadyLogged && date === today) {
        const habit = habits.find((h) => h.id === habitId);
        const text = pickAffirmation(habit?.minimumVersion);
        setAffirmations((prev) => ({ ...prev, [habitId]: text }));
        setTimeout(() => {
          setAffirmations((prev) => ({ ...prev, [habitId]: null }));
        }, 2200);
      }

      try {
        const res = await fetch("/api/habit-logs", {
          method: alreadyLogged ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId, date }),
        });

        if (!res.ok) throw new Error();
      } catch {
        // Revert optimistic update
        setLogDates((prev) => {
          const dates = prev[habitId] ?? [];
          return {
            ...prev,
            [habitId]: alreadyLogged
              ? [...dates, date].sort()
              : dates.filter((d) => d !== date),
          };
        });
        setAffirmations((prev) => ({ ...prev, [habitId]: null }));
        setErrors((prev) => ({ ...prev, [habitId]: "Could not save. Tap to retry." }));
        setTimeout(() => {
          setErrors((prev) => ({ ...prev, [habitId]: null }));
        }, 5000);
      } finally {
        setInFlight((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [habits, inFlight, logDates, today],
  );

  // ── On habit created ───────────────────────────────────────────────────────

  function handleCreated(created: { id: number; name: string }) {
    setFormMode(null);
    // Refetch to get the full HabitWithRecentLogs shape
    fetch("/api/habits")
      .then((r) => r.json())
      .then((data: HabitWithRecentLogs[]) => {
        setHabits(data);
        const updated: Record<number, string[]> = {};
        for (const h of data) updated[h.id] = h.recentLogDates;
        setLogDates(updated);
      })
      .catch(() => null);

    void created; // suppress unused warning — we refetch
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <HabitListSkeleton />;

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">{fetchError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Habits</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFormMode("walkthrough")}
            className="text-muted-foreground text-xs"
          >
            Walk me through it
          </Button>
          <Button size="sm" onClick={() => setFormMode("quick")}>
            + Add habit
          </Button>
        </div>
      </div>

      {/* List or empty state */}
      {habits.length === 0 ? (
        <EmptyState
          onQuick={() => setFormMode("quick")}
          onWalkthrough={() => setFormMode("walkthrough")}
        />
      ) : (
        <div className="flex flex-col">
          {habits.map((habit, i) => (
            <div key={habit.id}>
              <HabitRow
                habit={habit}
                logDates={logDates[habit.id] ?? []}
                today={today}
                inFlightDates={
                  new Set(
                    [...inFlight]
                      .filter((k) => k.startsWith(`${habit.id}:`))
                      .map((k) => k.split(":").slice(1).join(":")),
                  )
                }
                affirmation={affirmations[habit.id]}
                error={errors[habit.id]}
                onToggle={handleToggle}
              />
              {i < habits.length - 1 && <Separator className="opacity-40" />}
            </div>
          ))}
        </div>
      )}

      {/* Forms */}
      {formMode && (
        <HabitForm
          open
          mode={formMode}
          onClose={() => setFormMode(null)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HabitListSkeleton() {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between pb-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="flex items-center gap-4 py-4">
            <Skeleton className="w-2 h-2 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-5 w-[286px]" />
            <Skeleton className="h-5 w-14" />
          </div>
          {i < 3 && <Separator className="opacity-40" />}
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  onQuick,
  onWalkthrough,
}: {
  onQuick: () => void;
  onWalkthrough: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
        <Repeat className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1 max-w-xs">
        <p className="font-display text-lg font-medium">No habits yet</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Small, consistent actions shape identity. Start with one thing you
          want to be true about yourself.
        </p>
      </div>
      <div className="flex flex-col gap-2 items-center">
        <Button onClick={onWalkthrough}>Walk me through it</Button>
        <button
          type="button"
          onClick={onQuick}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          I know what I want, just add it
        </button>
      </div>
    </div>
  );
}
