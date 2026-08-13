"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TodaySession } from "@/types";
import { format } from "date-fns";
import { RestDayCard } from "./rest-day-card";
import { TodaySessionCard } from "./today-session-card";

export function TodaySessionsSection() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [sessions, setSessions] = useState<TodaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/today/sessions?date=${today}`);
      if (!res.ok) throw new Error("Failed to load today's sessions");
      setSessions((await res.json()) as TodaySession[]);
    } catch {
      setError("Could not load today's sessions.");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleComplete = useCallback(async (activityId: number, done: boolean) => {
    setSessions((prev) =>
      prev.map((s) => (s.activityId === activityId ? { ...s, isCompleted: done } : s))
    );

    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: done }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch {
      setSessions((prev) =>
        prev.map((s) =>
          s.activityId === activityId ? { ...s, isCompleted: !done } : s
        )
      );
    }
  }, []);

  return (
    <section className="mb-8">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        Today
      </h2>
      <p className="text-sm text-muted-foreground mt-0.5 mb-3">
        {format(new Date(), "EEEE, d MMM")}
      </p>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-[80px] w-full rounded-[0.625rem]" />
          <Skeleton className="h-[80px] w-full rounded-[0.625rem]" />
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : sessions.length === 0 ? (
        <RestDayCard />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <TodaySessionCard
              key={session.activityId}
              session={session}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
