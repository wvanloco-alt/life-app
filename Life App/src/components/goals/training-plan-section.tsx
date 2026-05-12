"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mountain,
  SkipForward,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import type { TrainingPlan, TrainingPhase, TennisSportProfile, RunningSportProfile } from "@/types";
import { getPhaseDisplayName } from "@/lib/training/periodization";

interface TrainingPlanSectionProps {
  plan: TrainingPlan;
  onRefresh: () => void;
  /** Shown on the goal card; used to reconcile split with goal.sessionsPerWeek */
  goalSessionsPerWeek: number;
  /** Climbing-only: opens edit dialog for split & preferred days */
  onEditTrainingSplit?: () => void;
}

const PHASE_COLORS: Record<string, string> = {
  "skill-stamina": "bg-emerald-500",
  "max-strength-power": "bg-red-500",
  "anaerobic-endurance": "bg-amber-500",
  rest: "bg-slate-400",
  "foundation-prehab": "bg-emerald-500",
  "strength-power": "bg-red-500",
  "tennis-endurance": "bg-amber-500",
  performance: "bg-blue-500",
  recovery: "bg-slate-400",
  "base-building": "bg-emerald-500",
  development: "bg-amber-500",
  "race-prep": "bg-orange-500",
  "base-injury-prevention": "bg-emerald-500",
  "strength-endurance": "bg-amber-500",
  "speed-specificity": "bg-orange-500",
  "taper-race": "bg-violet-500",
};

const PHASE_TEXT_COLORS: Record<string, string> = {
  "skill-stamina": "text-emerald-600 dark:text-emerald-400",
  "max-strength-power": "text-red-600 dark:text-red-400",
  "anaerobic-endurance": "text-amber-600 dark:text-amber-400",
  rest: "text-slate-500 dark:text-slate-400",
  "foundation-prehab": "text-emerald-600 dark:text-emerald-400",
  "strength-power": "text-red-600 dark:text-red-400",
  "tennis-endurance": "text-amber-600 dark:text-amber-400",
  performance: "text-blue-600 dark:text-blue-400",
  recovery: "text-slate-500 dark:text-slate-400",
  "base-building": "text-emerald-600 dark:text-emerald-400",
  development: "text-amber-600 dark:text-amber-400",
  "race-prep": "text-orange-600 dark:text-orange-400",
  "base-injury-prevention": "text-emerald-600 dark:text-emerald-400",
  "strength-endurance": "text-amber-600 dark:text-amber-400",
  "speed-specificity": "text-orange-600 dark:text-orange-400",
  "taper-race": "text-violet-600 dark:text-violet-400",
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  club: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  advanced: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const PLAYING_STYLE_LABELS: Record<string, string> = {
  baseliner: "Baseliner",
  "all-court": "All-Court",
  "serve-volley": "Serve & Volley",
};

const LIMITATION_LABELS: Record<string, string> = {
  shoulder: "Shoulder",
  back: "Back",
  knee: "Knee",
  elbow: "Elbow",
  ankle: "Ankle",
  adductor: "Adductor",
  achilles: "Achilles",
  shin: "Shin Splints",
  "plantar-fascia": "Plantar Fascia",
  "hip-adductor": "Hip/Adductor",
};

const GOAL_DISTANCE_LABELS: Record<string, string> = {
  "5k": "5K",
  "10k": "10K",
  "half-marathon": "Half Marathon",
  marathon: "Marathon",
  general: "General Fitness",
};

export function TrainingPlanSection({
  plan,
  onRefresh,
  goalSessionsPerWeek,
  onEditTrainingSplit,
}: TrainingPlanSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);

  const phases = plan.phases ?? [];
  const activePhase = phases.find((p) => p.status === "active");
  const totalWeeks = phases.reduce((s, p) => s + p.durationWeeks, 0);
  const isCompleted = plan.status === "completed";
  const isClimbingPlan = plan.sport === "climbing";
  const isTennis = plan.sport === "tennis";
  const isRunning = plan.sport === "running";
  const tennisProfile = isTennis ? (plan.sportProfile as TennisSportProfile) : null;
  const runningProfile = isRunning ? (plan.sportProfile as RunningSportProfile) : null;

  const activeWeekNum = activePhase ? getWeekInPhase(activePhase) : 0;

  async function handleTransition() {
    if (!activePhase) return;
    const phaseName = getPhaseDisplayName(activePhase.phaseType);
    if (!confirm(`Complete "${phaseName}" and move to the next phase?`)) return;
    setActing(true);
    try {
      await fetch(`/api/training-phases/${activePhase.id}/transition`, { method: "POST" });
      onRefresh();
    } finally {
      setActing(false);
    }
  }

  async function handleRestart() {
    if (!confirm("Restart the training cycle from today?")) return;
    setActing(true);
    try {
      await fetch(`/api/training-plans/${plan.id}/restart`, { method: "POST" });
      onRefresh();
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this training plan?")) return;
    setActing(true);
    try {
      await fetch(`/api/training-plans/${plan.id}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border bg-muted/20 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Training Plan</span>
          <Badge className={`text-[10px] px-1.5 py-0 ${LEVEL_COLORS[plan.playerLevel] ?? ""}`}>
            {plan.playerLevel}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {plan.periodizationModel}
          </Badge>
          {tennisProfile?.playingStyle && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {PLAYING_STYLE_LABELS[tennisProfile.playingStyle] ?? tennisProfile.playingStyle}
            </Badge>
          )}
          {runningProfile?.goalDistance && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {GOAL_DISTANCE_LABELS[runningProfile.goalDistance] ?? runningProfile.goalDistance}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Phase timeline bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted/40">
        {phases.map((phase) => {
          const widthPct = totalWeeks > 0 ? (phase.durationWeeks / totalWeeks) * 100 : 0;
          const isActive = phase.status === "active";
          const isComplete = phase.status === "completed";
          return (
            <div
              key={phase.id}
              className={`relative ${PHASE_COLORS[phase.phaseType] ?? "bg-slate-400"} ${
                isActive
                  ? "opacity-100 ring-1 ring-foreground/30"
                  : isComplete
                    ? "opacity-70"
                    : "opacity-25"
              }`}
              style={{ width: `${widthPct}%` }}
              title={`${getPhaseDisplayName(phase.phaseType)} (${phase.durationWeeks}w) — ${phase.status}`}
            />
          );
        })}
      </div>

      {/* Active phase info */}
      {activePhase && (
        <div className="flex items-center justify-between">
          <p className={`text-xs font-medium ${PHASE_TEXT_COLORS[activePhase.phaseType] ?? ""}`}>
            {getPhaseDisplayName(activePhase.phaseType)}
            <span className="text-muted-foreground font-normal ml-1">
              — Week {activeWeekNum}/{activePhase.durationWeeks}
            </span>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={handleTransition}
            disabled={acting}
          >
            <SkipForward className="mr-1 h-3 w-3" />
            Next Phase
          </Button>
        </div>
      )}

      {isCompleted && (
        <p className="text-xs text-muted-foreground">Cycle complete.</p>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-4 pt-2">
          {activePhase && (
            <div className="space-y-3">
              {activePhase.description.split("\n\n").map((section, idx) => {
                const lines = section.split("\n");
                if (lines.length > 1) {
                  return (
                    <div key={idx} className="space-y-1">
                      <h4 className="font-semibold text-[10px] tracking-wider uppercase text-foreground/80">
                        {lines[0]}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lines.slice(1).join(" ")}
                      </p>
                    </div>
                  );
                }
                return (
                  <p key={idx} className="text-xs text-muted-foreground leading-relaxed">
                    {section}
                  </p>
                );
              })}
            </div>
          )}

          {activePhase?.limitationNotes && (
            <div className="rounded border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5">
              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-0.5">
                Physical Limitations
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activePhase.limitationNotes}
              </p>
            </div>
          )}

          {tennisProfile?.physicalLimitations && tennisProfile.physicalLimitations.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {tennisProfile.physicalLimitations.map((lim) => (
                <Badge key={lim} variant="outline" className="text-[10px] px-1.5 py-0">
                  {LIMITATION_LABELS[lim] ?? lim}
                </Badge>
              ))}
            </div>
          )}
          {runningProfile?.physicalLimitations && runningProfile.physicalLimitations.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {runningProfile.physicalLimitations.map((lim) => (
                <Badge key={lim} variant="outline" className="text-[10px] px-1.5 py-0">
                  {LIMITATION_LABELS[lim] ?? lim}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {phases.map((phase) => (
              <div
                key={phase.id}
                className={`rounded border px-2 py-1.5 text-center text-[10px] ${
                  phase.status === "active"
                    ? "border-primary/50 bg-primary/5"
                    : phase.status === "completed"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/40"
                }`}
              >
                <div className={`font-medium ${PHASE_TEXT_COLORS[phase.phaseType] ?? ""}`}>
                  {getPhaseDisplayName(phase.phaseType)}
                </div>
                <div className="text-muted-foreground">{phase.durationWeeks}w</div>
              </div>
            ))}
          </div>

          {isClimbingPlan &&
            plan.trainingSessionsPerWeek != null &&
            plan.supplementalSessionsPerWeek != null &&
            plan.trainingSessionsPerWeek + plan.supplementalSessionsPerWeek !== goalSessionsPerWeek && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Weekly split sums to{" "}
                {plan.trainingSessionsPerWeek + plan.supplementalSessionsPerWeek}; goal is{" "}
                {goalSessionsPerWeek}/wk — open Edit plan to align.
              </p>
            )}

          <div className="flex gap-2 pt-1 flex-wrap">
            {isClimbingPlan && onEditTrainingSplit && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={onEditTrainingSplit}
                disabled={acting}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit plan
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={handleRestart}
              disabled={acting}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Restart Cycle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 text-red-600"
              onClick={handleDelete}
              disabled={acting}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function getWeekInPhase(phase: TrainingPhase): number {
  const now = new Date();
  const start = new Date(phase.startDate + "T00:00:00");
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, phase.durationWeeks));
}
