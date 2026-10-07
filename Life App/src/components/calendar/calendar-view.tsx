"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarConfigure,
  type CalendarConfigurePatch,
} from "@/components/calendar/calendar-configure";
import { CalendarDayPanel } from "@/components/calendar/calendar-day-panel";
import { CalendarLegend } from "@/components/calendar/calendar-legend";
import { CalendarMonth } from "@/components/calendar/calendar-month";
import { CalendarWeek } from "@/components/calendar/calendar-week";
import { Skeleton } from "@/components/ui/skeleton";
import { brusselsToday, weekStartMondayFromIso } from "@/lib/dates";
import type { CalendarResponse } from "@/types";

type CalendarMode = "week" | "month";

interface CalendarViewProps {
  mode: CalendarMode;
}

export function CalendarView({ mode }: CalendarViewProps) {
  const today = brusselsToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => weekStartMondayFromIso(today));
  const [monthIso, setMonthIso] = useState(() => today.slice(0, 7));
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterActivityId, setFilterActivityId] = useState<number | null>(null);
  const [configureOpen, setConfigureOpen] = useState(false);

  const range = useMemo(() => {
    if (mode === "week") {
      const start = weekStart;
      const end = format(
        endOfWeek(parseISO(weekStart), { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      return { from: start, to: end };
    }
    const monthStart = startOfMonth(parseISO(`${monthIso}-01`));
    const monthEnd = endOfMonth(monthStart);
    return {
      from: format(startOfWeek(monthStart, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      to: format(endOfWeek(monthEnd, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }, [mode, weekStart, monthIso]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/calendar?from=${range.from}&to=${range.to}`
      );
      if (!res.ok) throw new Error("load failed");
      setData((await res.json()) as CalendarResponse);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedDay = data?.days.find((d) => d.date === selectedDate);

  function patchDayCompletion(
    prev: CalendarResponse,
    date: string,
    activityTypeId: number,
    checked: boolean,
    locked = false
  ): CalendarResponse {
    const days = prev.days.map((day) => {
      if (day.date !== date) return day;
      const rest = day.completions.filter(
        (c) => c.activityTypeId !== activityTypeId
      );
      if (!checked) return { ...day, completions: rest };
      return {
        ...day,
        completions: [...rest, { activityTypeId, locked }],
      };
    });
    const hasDay = days.some((d) => d.date === date);
    if (!hasDay && checked) {
      days.push({
        date,
        completions: [{ activityTypeId, locked }],
      });
      days.sort((a, b) => a.date.localeCompare(b.date));
    }
    return { ...prev, days };
  }

  async function handleToggle(activityTypeId: number, checked: boolean) {
    if (!data) return;
    const snapshot = data;
    setData(patchDayCompletion(data, selectedDate, activityTypeId, checked));
    try {
      const res = await fetch("/api/calendar/check", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          activityTypeId,
          checked,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const body = (await res.json()) as {
        checked: boolean;
        locked: boolean;
      };
      setData((prev) =>
        prev
          ? patchDayCompletion(
              prev,
              selectedDate,
              activityTypeId,
              body.checked,
              body.locked
            )
          : prev
      );
    } catch {
      setData(snapshot);
      throw new Error("save failed");
    }
  }

  async function handleConfigureChange(
    activityId: number,
    patch: CalendarConfigurePatch
  ) {
    const res = await fetch(`/api/activity-types/${activityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("configure failed");
    await load();
  }

  async function handleCreateActivity(name: string) {
    const res = await fetch("/api/activity-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 409) {
      throw new Error(body.error ?? "That name is already used.");
    }
    if (!res.ok) throw new Error(body.error ?? "Could not add activity.");
    await load();
  }

  if (loading && !data) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Could not load the calendar.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            {mode === "week" ? "This week" : "Month"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Check off what you did — no duration or planning required.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfigureOpen((o) => !o)}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          {configureOpen ? "Close configure" : "Configure"}
        </button>
      </div>

      {configureOpen && (
        <CalendarConfigure
          activities={data.activities}
          onChange={handleConfigureChange}
          onCreate={handleCreateActivity}
          onClose={() => setConfigureOpen(false)}
        />
      )}

      {mode === "week" ? (
        <CalendarWeek
          weekStart={weekStart}
          days={data.days}
          activities={data.activities}
          selectedDate={selectedDate}
          filterActivityId={filterActivityId}
          onSelectDate={setSelectedDate}
          onWeekChange={(start) => {
            setWeekStart(start);
            setSelectedDate(start);
          }}
        />
      ) : (
        <CalendarMonth
          monthIso={monthIso}
          days={data.days}
          activities={data.activities}
          selectedDate={selectedDate}
          filterActivityId={filterActivityId}
          onSelectDate={setSelectedDate}
          onMonthChange={(month) => {
            setMonthIso(month);
            setSelectedDate(`${month}-01`);
          }}
        />
      )}

      <CalendarLegend
        activities={data.activities}
        filterActivityId={filterActivityId}
        onFilter={setFilterActivityId}
      />

      <CalendarDayPanel
        date={selectedDate}
        activities={data.activities}
        completions={selectedDay?.completions ?? []}
        onToggle={handleToggle}
      />
    </div>
  );
}
