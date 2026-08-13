"use client";

import { LucideIcon } from "@/components/ui/lucide-icon";
import type { TodaySession } from "@/types";
import { CheckCircle2, Circle } from "lucide-react";

interface TodaySessionCardProps {
  session: TodaySession;
  onComplete: (id: number, done: boolean) => void;
}

function sessionTypeLabel(sessionType: TodaySession["sessionType"]): string {
  return sessionType === "supplemental" ? "Supplemental session" : "Training session";
}

export function TodaySessionCard({ session, onComplete }: TodaySessionCardProps) {
  const readOnly = session.garminLinked && session.isCompleted;

  function handleToggle() {
    if (readOnly) return;
    onComplete(session.activityId, !session.isCompleted);
  }

  return (
    <div
      className={`rounded-[0.625rem] border border-border/60 bg-card px-4 py-3 min-h-[80px] transition-opacity duration-200 ease-out ${
        session.isCompleted ? "opacity-75 border-border/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <LucideIcon name={session.activityTypeIcon} size="sm" className="bg-transparent" />
              <span className="font-medium truncate">{session.activityTypeName}</span>
            </div>
            <div className="text-right shrink-0">
              <p className="font-[family-name:var(--font-display)] text-sm font-medium leading-tight">
                {session.phaseName}
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
                Week {session.phaseWeekNumber}/{session.phaseTotalWeeks}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {sessionTypeLabel(session.sessionType)} ·{" "}
            <span className="font-[family-name:var(--font-mono)] tabular-nums">
              {session.durationMinutes} min
            </span>
          </p>

          {session.focusLine && (
            <p className="text-[13px] text-muted-foreground leading-snug">
              Focus: {session.focusLine}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label={session.isCompleted ? "Session completed" : "Mark session done"}
            disabled={readOnly}
            onClick={handleToggle}
            className={readOnly ? "cursor-default" : "hover:opacity-80 transition-opacity"}
          >
            {session.isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-[oklch(var(--palette-green))]" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40" />
            )}
          </button>
          {readOnly && (
            <span className="text-[10px] text-muted-foreground/70">via Garmin</span>
          )}
        </div>
      </div>
    </div>
  );
}
