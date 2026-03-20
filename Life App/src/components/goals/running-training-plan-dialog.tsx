"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Info } from "lucide-react";
import type { LevelAssessment, RunningGoalDistance, RunningLimitation } from "@/types";
import { format } from "date-fns";

interface RunningTrainingPlanDialogProps {
  open: boolean;
  onClose: () => void;
  goalId: number;
  goalTitle: string;
  onCreated: () => void;
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  advanced: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const MODEL_LABELS: Record<string, string> = {
  "3-phase": "3-phase cycle (Beginner)",
  "4-phase": "4-phase cycle (Intermediate/Advanced)",
};

const GOAL_DISTANCES: { value: RunningGoalDistance; label: string }[] = [
  { value: "5k", label: "5K" },
  { value: "10k", label: "10K" },
  { value: "half-marathon", label: "Half Marathon" },
  { value: "marathon", label: "Marathon" },
  { value: "general", label: "General Fitness" },
];

const LIMITATIONS: { value: RunningLimitation; label: string }[] = [
  { value: "achilles", label: "Achilles" },
  { value: "knee", label: "Knee (Runner's Knee)" },
  { value: "shin", label: "Shin Splints" },
  { value: "plantar-fascia", label: "Plantar Fascia" },
  { value: "back", label: "Back (Scheuermann's)" },
  { value: "hip-adductor", label: "Hip / Adductor" },
];

export function RunningTrainingPlanDialog({
  open,
  onClose,
  goalId,
  goalTitle,
  onCreated,
}: RunningTrainingPlanDialogProps) {
  const [runsPerWeek, setRunsPerWeek] = useState(3);
  const [yearsExperience, setYearsExperience] = useState(1);
  const [canRun30MinContinuous, setCanRun30MinContinuous] = useState(true);
  const [hasRaced, setHasRaced] = useState(false);
  const [goalDistance, setGoalDistance] = useState<RunningGoalDistance>("general");
  const [longestRecentRun, setLongestRecentRun] = useState(30);
  const [physicalLimitations, setPhysicalLimitations] = useState<RunningLimitation[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [assessment, setAssessment] = useState<LevelAssessment | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/training-plans/assess-level", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sport: "running",
            runsPerWeek,
            yearsExperience,
            canRun30MinContinuous,
            hasRaced,
          }),
        });
        if (res.ok) setAssessment(await res.json());
      } catch { /* ignore */ }
    }, 150);
    return () => clearTimeout(timer);
  }, [open, runsPerWeek, yearsExperience, canRun30MinContinuous, hasRaced]);

  function toggleLimitation(lim: RunningLimitation) {
    setPhysicalLimitations((prev) =>
      prev.includes(lim) ? prev.filter((l) => l !== lim) : [...prev, lim]
    );
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await fetch("/api/training-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId,
          sport: "running",
          yearsExperience,
          startDate,
          sportProfile: {
            goalDistance,
            runsPerWeek,
            longestRecentRun,
            canRun30MinContinuous,
            hasRaced,
            physicalLimitations,
          },
        }),
      });
      if (res.ok) {
        onCreated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🏃 Running Training Plan
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{goalTitle}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Runs per week + Years + Start Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Runs/Week</Label>
              <Input
                type="number"
                min={0}
                max={7}
                value={runsPerWeek}
                onChange={(e) => setRunsPerWeek(Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Years Running</Label>
              <Input
                type="number"
                min={0}
                max={40}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={canRun30MinContinuous}
                onCheckedChange={(v) => setCanRun30MinContinuous(!!v)}
              />
              <span className="text-xs">Can run 30 min continuously</span>
            </label>
            <label className="flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={hasRaced}
                onCheckedChange={(v) => setHasRaced(!!v)}
              />
              <span className="text-xs">Has completed a race</span>
            </label>
          </div>

          {/* Goal Distance */}
          <div className="space-y-1.5">
            <Label className="text-xs">Goal Distance</Label>
            <div className="flex flex-wrap gap-2">
              {GOAL_DISTANCES.map((d) => (
                <Button
                  key={d.value}
                  type="button"
                  variant={goalDistance === d.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setGoalDistance(d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Longest Recent Run */}
          <div className="space-y-1.5">
            <Label className="text-xs">Longest Recent Run (minutes)</Label>
            <Input
              type="number"
              min={0}
              max={300}
              value={longestRecentRun}
              onChange={(e) => setLongestRecentRun(Number(e.target.value))}
              className="h-9"
            />
          </div>

          {/* Physical Limitations */}
          <div className="space-y-1.5">
            <Label className="text-xs">Physical Limitations (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              {LIMITATIONS.map((lim) => (
                <label
                  key={lim.value}
                  className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={physicalLimitations.includes(lim.value)}
                    onCheckedChange={() => toggleLimitation(lim.value)}
                  />
                  <span className="text-xs">{lim.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Assessment Preview */}
          {assessment && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${LEVEL_COLORS[assessment.derivedLevel] ?? ""}`}>
                  {assessment.derivedLevel.charAt(0).toUpperCase() + assessment.derivedLevel.slice(1)}
                </Badge>
                <span className="text-xs font-medium">
                  {MODEL_LABELS[assessment.recommendedModel] ?? assessment.recommendedModel}
                </span>
                {assessment.cycleLengthWeeks && (
                  <span className="text-xs text-muted-foreground">
                    ({assessment.cycleLengthWeeks} weeks)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {assessment.explanation}
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={saving || !assessment}
          >
            {saving ? "Creating..." : "Create Training Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
