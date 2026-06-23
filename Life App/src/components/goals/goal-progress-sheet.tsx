"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface LogEntry {
  type: "session" | "tally";
  date: string;
  value: number;
  valueLabel: string;
  notes: string | null;
}

interface GoalProgressSheetProps {
  goalId: number;
  goalTitle: string;
  open: boolean;
  onClose: () => void;
}

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const notes = entry.notes?.trim();
  const showExpand = notes != null && notes.length > 80;

  return (
    <div className="rounded-lg border border-border/50 px-3 py-2.5 space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">
          {format(new Date(`${entry.date}T00:00:00`), "d MMM yyyy")}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {entry.valueLabel}
        </span>
      </div>
      {notes && (
        <p className={`text-xs text-muted-foreground ${!expanded && showExpand ? "line-clamp-2" : ""}`}>
          {notes}
        </p>
      )}
      {showExpand && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-0 text-xs text-primary"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </div>
  );
}

export function GoalProgressSheet({
  goalId,
  goalTitle,
  open,
  onClose,
}: GoalProgressSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/goals/${goalId}/log`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load progress log");
        }
        return res.json() as Promise<LogEntry[]>;
      })
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, goalId]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-[family-name:var(--font-display)] text-left pr-8">
            Progress log — {goalTitle}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {loading &&
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}

          {!loading && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">No progress logged yet.</p>
          )}

          {!loading &&
            !error &&
            entries.map((entry, index) => (
              <LogEntryRow key={`${entry.date}-${entry.value}-${index}`} entry={entry} />
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
