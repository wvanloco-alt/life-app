"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ActivityCard,
  CaloriesCard,
  HabitConsistencyCard,
  SleepCard,
  type DashboardPayload,
} from "./dashboard-cards";

const SYNC_STALE_MINUTES = 30;

function isStale(lastSyncedAt: string | null): boolean {
  if (!lastSyncedAt) return true;
  return (Date.now() - new Date(lastSyncedAt).getTime()) > SYNC_STALE_MINUTES * 60 * 1000;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-[0.625rem]" />
        <Skeleton className="h-32 rounded-[0.625rem]" />
        <Skeleton className="h-32 rounded-[0.625rem]" />
      </div>
      <Skeleton className="h-48 rounded-[0.625rem]" />
    </div>
  );
}

export function DashboardView() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const payload = (await res.json()) as DashboardPayload;
      setData(payload);
      return payload;
    } catch {
      setError("Could not load your dashboard right now.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const payload = await load();
      if (!payload?.garminConnected || !isStale(payload.lastSyncedAt)) return;
      setSyncing(true);
      try {
        await fetch("/api/garmin/sync", { method: "POST" });
        await load();
      } finally {
        setSyncing(false);
      }
    })();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-sm text-muted-foreground">{error || "Something went wrong."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {syncing
            ? "Syncing Garmin…"
            : "How your week is shaping up — no logging required."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SleepCard sleep={data.sleep} garminConnected={data.garminConnected} />
        <CaloriesCard calories={data.calories} garminConnected={data.garminConnected} />
        <ActivityCard activities={data.activities} garminConnected={data.garminConnected} />
      </div>

      <HabitConsistencyCard habits={data.habits} />
    </div>
  );
}
