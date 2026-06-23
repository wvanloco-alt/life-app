"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { computeWeekN } from "@/lib/training/phase-utils";
import type { Activity, Goal } from "@/types";

interface TrainingPhaseEntry {
  phaseName: string;
  phaseStartDate: string;
  durationWeeks: number;
}

interface TallyProgressEntry {
  current: number;
  target: number;
  percentage: number;
}

interface GoalOverviewSectionProps {
  goals: Goal[];
  trainingPhaseInfo: Record<number, TrainingPhaseEntry>;
  weekActivities?: Activity[];
  tallyProgress?: Record<number, TallyProgressEntry>;
  loading?: boolean;
  heading?: string;
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

export function GoalOverviewSection({
  goals,
  trainingPhaseInfo,
  weekActivities = [],
  tallyProgress = {},
  loading = false,
  heading = "Focus this week",
}: GoalOverviewSectionProps) {
  if (!loading && goals.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{heading}</p>

      {loading ? (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-20 w-52 rounded-lg" />
          <Skeleton className="h-20 w-52 rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {goals.map((goal) => {
            const phase = trainingPhaseInfo[goal.id];
            const weekN = phase ? computeWeekN(phase.phaseStartDate, phase.durationWeeks) : null;
            const roleColor = goal.roles[0]?.color;
            const isTallyGoal = goal.targetMetric != null;
            const completedSessions = weekActivities.filter(
              (a) => a.goalId === goal.id && a.isCompleted
            ).length;
            const sessionTarget = goal.sessionsPerWeek;
            const sessionPercentage =
              sessionTarget > 0
                ? Math.min(100, Math.round((completedSessions / sessionTarget) * 100))
                : 0;
            const tally = tallyProgress[goal.id];

            return (
              <Link key={goal.id} href="/goals" className="block">
                <div
                  className="rounded-lg border p-3 space-y-2 min-w-[180px] max-w-xs hover:bg-accent/50 transition-colors"
                  style={{
                    borderLeftWidth: roleColor ? "3px" : undefined,
                    borderLeftColor: roleColor ?? undefined,
                    backgroundColor: roleColor ? `${roleColor}15` : undefined,
                  }}
                >
                  <p className="text-sm font-medium leading-tight line-clamp-2">{goal.title}</p>

                  {isTallyGoal && tally ? (
                    <GoalCardProgressBar
                      current={tally.current}
                      target={tally.target}
                      percentage={tally.percentage}
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
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
