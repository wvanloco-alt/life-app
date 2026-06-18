"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { computeWeekN } from "@/lib/training/phase-utils";
import type { Activity, Goal } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrainingPhaseEntry {
  phaseName: string;
  phaseStartDate: string;
  durationWeeks: number;
  sportFocusContent?: string | null;
  supplementalContent?: string | null;
}

export interface GoalOverviewSectionProps {
  goals: Goal[];
  trainingPhaseInfo: Record<number, TrainingPhaseEntry>;
  loading?: boolean;
  /** Section heading. Omit to render cards without a header label. */
  heading?: string;
  /** All activities for the current week. Used to compute supplemental context. */
  weekActivities?: Activity[];
  /** ISO date string for today — used for tally logging. Defaults to today. */
  today?: string;
  /** Called when the user clicks "Log session" on a session-based goal card. */
  onLogActivity?: (goal: Goal) => void;
  /**
   * When true, renders a "No focus goals set" prompt with a link to Monthly Plan
   * instead of returning null when goals is empty. Default false — callers that
   * show this section on every view (e.g. Today) should leave this unset so an
   * empty day doesn't surface a misleading "no goals" message.
   */
  showEmptyPrompt?: boolean;
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  phase,
  weekActivities,
  today,
  onLogActivity,
}: {
  goal: Goal;
  phase: TrainingPhaseEntry | undefined;
  weekActivities: Activity[];
  today: string;
  onLogActivity?: (goal: Goal) => void;
}) {
  const [tallyAdded, setTallyAdded] = useState(0);
  const [tallyError, setTallyError] = useState(false);
  const [focusExpanded, setFocusExpanded] = useState(false);
  const [supplementalExpanded, setSupplementalExpanded] = useState(false);

  // targetMetric is null for session-based goals; non-null string for tally/metric goals
  // (goal-form-standalone.tsx explicitly sets payload.targetMetric = null for session goals).
  const isTallyGoal = goal.targetMetric !== null;

  const trainingCount = weekActivities.filter(
    (a) => a.goalId === goal.id && a.sessionType === "training"
  ).length;
  const supplementalCount = weekActivities.filter(
    (a) => a.goalId === goal.id && a.sessionType === "supplemental"
  ).length;
  const hasSupplementalThisWeek = supplementalCount > 0;

  const weekN = phase ? computeWeekN(phase.phaseStartDate, phase.durationWeeks) : null;
  const focusContent = phase?.sportFocusContent ?? null;
  const isLongFocus = focusContent !== null && focusContent.length > 120;
  const supplementalContent = hasSupplementalThisWeek ? (phase?.supplementalContent ?? null) : null;
  const isLongSupplemental = supplementalContent !== null && supplementalContent.length > 120;

  async function handleTallyIncrement() {
    try {
      const res = await fetch("/api/goal-tallies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal.id, date: today, count: 1 }),
      });
      if (!res.ok) throw new Error("Failed");
      setTallyAdded((n) => n + 1);
    } catch {
      setTallyError(true);
      setTimeout(() => setTallyError(false), 3000);
    }
  }

  return (
    <div
      id={`goal-${goal.id}`}
      className="rounded-lg border p-4 space-y-2 scroll-mt-4"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <Link href="/goals" className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight hover:underline truncate">
            {goal.title}
          </p>
        </Link>

        {/* Inline log progress */}
        <div className="shrink-0 flex items-center gap-1.5">
          {isTallyGoal ? (
            <>
              {tallyAdded > 0 && (
                <span className="text-xs text-muted-foreground">+{tallyAdded}</span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs px-2"
                onClick={handleTallyIncrement}
              >
                +1
              </Button>
              {tallyError && (
                <span className="text-[10px] text-destructive">Error</span>
              )}
            </>
          ) : onLogActivity ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={() => onLogActivity(goal)}
            >
              Log session
            </Button>
          ) : null}
        </div>
      </div>

      {/* Phase info */}
      {phase && weekN !== null && (
        <p className="text-xs text-muted-foreground">
          Active: {phase.phaseName} — Week {weekN} of {phase.durationWeeks}
        </p>
      )}

      {/* Training focus content */}
      {focusContent && (
        <div>
          <p
            className={cn(
              "text-xs text-muted-foreground leading-relaxed",
              !focusExpanded && "line-clamp-2"
            )}
          >
            {focusContent}
          </p>
          {isLongFocus && (
            <button
              className="text-[11px] text-primary hover:underline mt-0.5"
              onClick={() => setFocusExpanded((e) => !e)}
            >
              {focusExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Supplemental content — only when there's a supplemental activity this week */}
      {supplementalContent && (
        <div>
          <p
            className={cn(
              "text-xs text-muted-foreground leading-relaxed",
              !supplementalExpanded && "line-clamp-2"
            )}
          >
            {supplementalContent}
          </p>
          {isLongSupplemental && (
            <button
              className="text-[11px] text-primary hover:underline mt-0.5"
              onClick={() => setSupplementalExpanded((e) => !e)}
            >
              {supplementalExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Week activity count */}
      {(trainingCount > 0 || supplementalCount > 0) && (
        <p className="text-[10px] text-muted-foreground tabular-nums">
          This week:{" "}
          {trainingCount > 0 && `${trainingCount} training`}
          {trainingCount > 0 && supplementalCount > 0 && ", "}
          {supplementalCount > 0 && `${supplementalCount} supplemental`}
        </p>
      )}
    </div>
  );
}

// ─── GoalOverviewSection ──────────────────────────────────────────────────────

export function GoalOverviewSection({
  goals,
  trainingPhaseInfo,
  loading = false,
  heading,
  weekActivities = [],
  today,
  onLogActivity,
  showEmptyPrompt = false,
}: GoalOverviewSectionProps) {
  const todayStr = today ?? new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-3">
        {heading && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {heading}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-20 w-64 rounded-lg" />
          <Skeleton className="h-20 w-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    if (!showEmptyPrompt) return null;
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No focus goals set —{" "}
          <Link href="/monthly-plan" className="text-primary hover:underline">
            open Monthly Plan
          </Link>{" "}
          to add some.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {heading && (
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {heading}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            phase={trainingPhaseInfo[goal.id]}
            weekActivities={weekActivities}
            today={todayStr}
            onLogActivity={onLogActivity}
          />
        ))}
      </div>
    </div>
  );
}
