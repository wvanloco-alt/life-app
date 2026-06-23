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

export interface TallyProgressEntry {
  current: number;
  target: number;
  percentage: number;
}

export interface GoalOverviewSectionProps {
  goals: Goal[];
  trainingPhaseInfo: Record<number, TrainingPhaseEntry>;
  loading?: boolean;
  /** Section heading. Omit to render cards without a header label. */
  heading?: string;
  /** All activities for the current week. Used to compute supplemental context. */
  weekActivities?: Activity[];
  /** Tally goal progress keyed by goal id (from GET /api/goals/:id/progress). */
  tallyProgress?: Record<number, TallyProgressEntry>;
  /** ISO date string for today — used for tally logging. Defaults to today. */
  today?: string;
  /** Called when the user clicks "Log session" on a goal card. */
  onLogActivity?: (goal: Goal) => void;
  /**
   * When true, renders a "No focus goals set" prompt with a link to Monthly Plan
   * instead of returning null when goals is empty. Default false — callers that
   * show this section on every view (e.g. Today) should leave this unset so an
   * empty day doesn't surface a misleading "no goals" message.
   */
  showEmptyPrompt?: boolean;
}

function GoalCardProgressBar({
  current,
  target,
  percentage,
}: {
  current: number;
  target: number;
  percentage: number;
}) {
  if (target <= 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>This week</span>
        <span className="tabular-nums">
          {current} / {target}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  phase,
  weekActivities,
  onLogActivity,
  tallyProgress,
}: {
  goal: Goal;
  phase: TrainingPhaseEntry | undefined;
  weekActivities: Activity[];
  onLogActivity?: (goal: Goal) => void;
  tallyProgress?: TallyProgressEntry;
}) {
  const [focusExpanded, setFocusExpanded] = useState(false);
  const [supplementalExpanded, setSupplementalExpanded] = useState(false);

  const isTallyGoal = goal.targetMetric !== null;
  const roleColor = goal.roles[0]?.color;

  const supplementalCount = weekActivities.filter(
    (a) => a.goalId === goal.id && a.sessionType === "supplemental"
  ).length;
  const hasSupplementalThisWeek = supplementalCount > 0;

  const weekN = phase ? computeWeekN(phase.phaseStartDate, phase.durationWeeks) : null;
  const focusContent = phase?.sportFocusContent ?? null;
  const isLongFocus = focusContent !== null && focusContent.length > 120;
  const supplementalContent = hasSupplementalThisWeek ? (phase?.supplementalContent ?? null) : null;
  const isLongSupplemental = supplementalContent !== null && supplementalContent.length > 120;

  // Session progress on Today counts completed scheduled activities for this week,
  // not activity_logs. Manual logs (Log Activity) appear on the Goals page but not
  // here — intentional: Today reflects calendar execution, not total logged volume.
  const completedSessions = weekActivities.filter(
    (a) => a.goalId === goal.id && a.isCompleted
  ).length;
  const sessionTarget = goal.sessionsPerWeek;
  const sessionPercentage =
    sessionTarget > 0
      ? Math.min(100, Math.round((completedSessions / sessionTarget) * 100))
      : 0;

  return (
    <div
      id={`goal-${goal.id}`}
      className="rounded-lg border p-4 space-y-2 scroll-mt-4"
      style={{
        borderLeftWidth: roleColor ? "3px" : undefined,
        borderLeftColor: roleColor ?? undefined,
        backgroundColor: roleColor ? `${roleColor}15` : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <Link href="/goals" className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight hover:underline truncate">
            {goal.title}
          </p>
        </Link>

        {onLogActivity && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2 shrink-0"
            onClick={() => onLogActivity(goal)}
          >
            Log session
          </Button>
        )}
      </div>

      {isTallyGoal && tallyProgress ? (
        <GoalCardProgressBar
          current={tallyProgress.current}
          target={tallyProgress.target}
          percentage={tallyProgress.percentage}
        />
      ) : !isTallyGoal ? (
        <GoalCardProgressBar
          current={completedSessions}
          target={sessionTarget}
          percentage={sessionPercentage}
        />
      ) : null}

      {phase && weekN !== null && (
        <p className="text-xs text-muted-foreground line-clamp-1">
          Active: {phase.phaseName} — Week {weekN} of {phase.durationWeeks}
        </p>
      )}

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
  tallyProgress = {},
  onLogActivity,
  showEmptyPrompt = false,
}: GoalOverviewSectionProps) {
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
            onLogActivity={onLogActivity}
            tallyProgress={tallyProgress[goal.id]}
          />
        ))}
      </div>
    </div>
  );
}
