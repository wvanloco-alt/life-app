"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Mountain, Info } from "lucide-react";
import type {
  LevelAssessment,
  Discipline,
  ClimbingLimitation,
  ClimbingSportProfile,
  TrainingPlan,
} from "@/types";
import { GRADE_ORDER } from "@/lib/training/periodization";
import { defaultSplit, isValidSplit } from "@/lib/training/split";
import { format } from "date-fns";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

function PreferredDayRow({
  label,
  subtitle,
  selected,
  onToggle,
}: {
  label: string;
  subtitle?: string;
  selected: Set<number>;
  onToggle: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <Label className="text-xs">{label}</Label>
        {subtitle ? (
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {WEEKDAYS.map((day) => (
          <button
            key={day.value}
            type="button"
            onClick={() => onToggle(day.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selected.has(day.value)
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TrainingPlanDialogProps {
  open: boolean;
  onClose: () => void;
  goalId: number;
  goalTitle: string;
  goalSessionsPerWeek: number;
  /** When provided, opens in edit mode; save uses PATCH split fields only */
  existingPlan?: TrainingPlan | null;
  onSuccess: () => void;
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  advanced: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const MODEL_LABELS: Record<string, string> = {
  "4-1": "4-1 cycle (5 weeks)",
  "4-3-2-1": "4-3-2-1 cycle (10 weeks)",
  "3-2-1": "3-2-1 cycle (6 weeks)",
};

const CLIMBING_LIMITATIONS: { value: ClimbingLimitation; label: string }[] = [
  { value: "fingers", label: "Fingers / Pulleys" },
  { value: "shoulder", label: "Shoulder" },
  { value: "elbow", label: "Elbow (Golfer's/Tennis)" },
  { value: "back", label: "Back" },
  { value: "wrist", label: "Wrist" },
];

export function TrainingPlanDialog({
  open,
  onClose,
  goalId,
  goalTitle,
  goalSessionsPerWeek,
  existingPlan,
  onSuccess,
}: TrainingPlanDialogProps) {
  const isEditMode = !!existingPlan;
  const [discipline, setDiscipline] = useState<Discipline>("bouldering");
  const [maxBoulderGrade, setMaxBoulderGrade] = useState("5c");
  const [maxSportGrade, setMaxSportGrade] = useState("6a");
  const [yearsExperience, setYearsExperience] = useState(2);
  const [physicalLimitations, setPhysicalLimitations] = useState<ClimbingLimitation[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [assessment, setAssessment] = useState<LevelAssessment | null>(null);
  const [saving, setSaving] = useState(false);

  const [trainingSessionsInput, setTrainingSessionsInput] = useState("");
  const [supplementalSessionsInput, setSupplementalSessionsInput] = useState("");
  const [trainingPreferredDays, setTrainingPreferredDays] = useState<Set<number>>(new Set());
  const [supplementalPreferredDays, setSupplementalPreferredDays] = useState<Set<number>>(new Set());

  const hydrateFromExisting = useCallback(
    (plan: TrainingPlan) => {
      const cp = plan.sportProfile as ClimbingSportProfile;
      setDiscipline(cp.discipline ?? "bouldering");
      setMaxBoulderGrade(cp.maxBoulderGrade ?? "5c");
      setMaxSportGrade(cp.maxSportGrade ?? "6a");
      setYearsExperience(plan.yearsExperience);
      setPhysicalLimitations(cp.physicalLimitations ?? []);
      setStartDate(plan.startDate.slice(0, 10));

      const t = plan.trainingSessionsPerWeek;
      const s = plan.supplementalSessionsPerWeek;
      if (t != null && s != null) {
        setTrainingSessionsInput(String(t));
        setSupplementalSessionsInput(String(s));
      } else {
        const d = defaultSplit(goalSessionsPerWeek);
        setTrainingSessionsInput(String(d.training));
        setSupplementalSessionsInput(String(d.supplemental));
      }

      setTrainingPreferredDays(new Set(plan.trainingPreferredDays ?? []));
      setSupplementalPreferredDays(new Set(plan.supplementalPreferredDays ?? []));
    },
    [goalSessionsPerWeek]
  );

  const hydrateForCreate = useCallback(() => {
    const d = defaultSplit(goalSessionsPerWeek);
    setTrainingSessionsInput(String(d.training));
    setSupplementalSessionsInput(String(d.supplemental));
    setTrainingPreferredDays(new Set());
    setSupplementalPreferredDays(new Set());

    setDiscipline("bouldering");
    setMaxBoulderGrade("5c");
    setMaxSportGrade("6a");
    setYearsExperience(2);
    setPhysicalLimitations([]);
    setStartDate(format(new Date(), "yyyy-MM-dd"));
  }, [goalSessionsPerWeek]);

  useEffect(() => {
    if (!open) return;
    if (existingPlan) {
      hydrateFromExisting(existingPlan);
    } else {
      hydrateForCreate();
    }
  }, [open, existingPlan?.id, goalId, hydrateFromExisting, hydrateForCreate, existingPlan]);

  useEffect(() => {
    if (!open || isEditMode) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/training-plans/assess-level", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sport: "climbing",
            maxBoulderGrade,
            maxSportGrade,
            yearsExperience,
          }),
        });
        if (res.ok) setAssessment(await res.json());
      } catch {
        /* ignore */
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [open, isEditMode, maxBoulderGrade, maxSportGrade, yearsExperience]);

  useEffect(() => {
    if (isEditMode || !open) return;
    setAssessment(null);
  }, [open, isEditMode]);

  function toggleLimitation(lim: ClimbingLimitation) {
    setPhysicalLimitations((prev) =>
      prev.includes(lim) ? prev.filter((l) => l !== lim) : [...prev, lim]
    );
  }

  function toggleTrainingDay(value: number) {
    setTrainingPreferredDays((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function toggleSupplementalDay(value: number) {
    setSupplementalPreferredDays((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const trainingParsed = parseInt(trainingSessionsInput, 10);
  const supplementalParsed = parseInt(supplementalSessionsInput, 10);
  const splitValid =
    isValidSplit(trainingParsed, supplementalParsed, goalSessionsPerWeek);

  const showReconcileBanner =
    isEditMode &&
    existingPlan != null &&
    existingPlan.trainingSessionsPerWeek != null &&
    existingPlan.supplementalSessionsPerWeek != null &&
    existingPlan.trainingSessionsPerWeek + existingPlan.supplementalSessionsPerWeek !==
      goalSessionsPerWeek;

  function applyDefaultSplitInputs() {
    const d = defaultSplit(goalSessionsPerWeek);
    setTrainingSessionsInput(String(d.training));
    setSupplementalSessionsInput(String(d.supplemental));
  }

  async function handleSubmit() {
    const trainingSessionsPerWeek = trainingParsed;
    const supplementalSessionsPerWeek = supplementalParsed;
    if (!isValidSplit(trainingSessionsPerWeek, supplementalSessionsPerWeek, goalSessionsPerWeek)) {
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && existingPlan) {
        const res = await fetch(`/api/training-plans/${existingPlan.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trainingSessionsPerWeek,
            supplementalSessionsPerWeek,
            trainingPreferredDays: [...trainingPreferredDays].sort((a, b) => a - b),
            supplementalPreferredDays: [...supplementalPreferredDays].sort((a, b) => a - b),
          }),
        });
        if (res.ok) {
          onSuccess();
          onClose();
        }
      } else {
        const res = await fetch("/api/training-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalId,
            sport: "climbing",
            yearsExperience,
            startDate,
            sportProfile: {
              discipline,
              maxBoulderGrade,
              maxSportGrade,
              physicalLimitations,
            },
            trainingSessionsPerWeek,
            supplementalSessionsPerWeek,
            trainingPreferredDays: [...trainingPreferredDays].sort((a, b) => a - b),
            supplementalPreferredDays: [...supplementalPreferredDays].sort((a, b) => a - b),
          }),
        });
        if (res.ok) {
          onSuccess();
          onClose();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const canSubmitCreate = Boolean(assessment) && splitValid;
  const canSubmitEdit = splitValid;

  const fieldsLocked = isEditMode;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-display)]">
            <Mountain className="h-4 w-4" />
            {isEditMode ? "Edit training plan" : "Create training plan"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{goalTitle}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {showReconcileBanner && (
            <div className="rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 dark:bg-amber-950/80">
              <p className="text-xs text-amber-900 dark:text-amber-100 mb-2">
                This goal is set to{" "}
                <span className="font-semibold">{goalSessionsPerWeek} sessions/week</span>, but
                this plan totals{" "}
                {(existingPlan?.trainingSessionsPerWeek ?? 0) +
                  (existingPlan?.supplementalSessionsPerWeek ?? 0)}
                .
                Align the split with your goal, or tap reset to apply the suggested default.
              </p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={applyDefaultSplitInputs}>
                Reset to default
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Discipline</Label>
            <div className="flex gap-2">
              {(["bouldering", "sport"] as const).map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={discipline === d ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDiscipline(d)}
                  disabled={fieldsLocked}
                >
                  {d === "bouldering" ? "Bouldering" : "Sport climbing"}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Boulder Grade</Label>
              <Select value={maxBoulderGrade} onValueChange={setMaxBoulderGrade} disabled={fieldsLocked}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_ORDER.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Hardest grade you send consistently</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Current Sport Grade</Label>
              <Select value={maxSportGrade} onValueChange={setMaxSportGrade} disabled={fieldsLocked}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_ORDER.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Hardest route you redpoint consistently</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Years of Experience</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(Number(e.target.value))}
                className="h-9"
                disabled={fieldsLocked}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
                disabled={fieldsLocked}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <div>
              <Label className="text-xs font-medium">Weekly session split</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Must sum to{" "}
                <span className="font-medium text-foreground">{goalSessionsPerWeek}</span> (this goal&apos;s
                sessions/week).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tp-training" className="text-xs">
                  Training sessions/week
                </Label>
                <Input
                  id="tp-training"
                  type="number"
                  min={0}
                  className={`h-9 ${!splitValid && trainingSessionsInput !== "" ? "border-destructive" : ""}`}
                  value={trainingSessionsInput}
                  onChange={(e) => setTrainingSessionsInput(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tp-supplemental" className="text-xs">
                  Supplemental sessions/week
                </Label>
                <Input
                  id="tp-supplemental"
                  type="number"
                  min={0}
                  className={`h-9 ${!splitValid && supplementalSessionsInput !== "" ? "border-destructive" : ""}`}
                  value={supplementalSessionsInput}
                  onChange={(e) => setSupplementalSessionsInput(e.target.value)}
                />
              </div>
            </div>
            {!splitValid && trainingSessionsInput !== "" && supplementalSessionsInput !== "" ? (
              <p className="text-xs text-destructive">
                Training + supplemental must equal {goalSessionsPerWeek}.
              </p>
            ) : null}
            {goalSessionsPerWeek === 2 ? (
              <p className="text-sm text-muted-foreground">
                The source material recommends supplemental work alongside training. If your schedule allows
                more than 2 sessions per week, the default will add supplemental sessions automatically.
              </p>
            ) : null}
          </div>

          <PreferredDayRow
            label="Training preferred days"
            subtitle="Leave empty — scheduler picks freely."
            selected={trainingPreferredDays}
            onToggle={toggleTrainingDay}
          />

          <PreferredDayRow
            label="Supplemental preferred days"
            subtitle="Gym-focused sessions. Empty = no preference."
            selected={supplementalPreferredDays}
            onToggle={toggleSupplementalDay}
          />

          <div className="space-y-1.5">
            <Label className="text-xs">Physical Considerations (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              {CLIMBING_LIMITATIONS.map((lim) => (
                <label
                  key={lim.value}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${
                    fieldsLocked ? "opacity-70 pointer-events-none" : "cursor-pointer hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={physicalLimitations.includes(lim.value)}
                    onCheckedChange={() => toggleLimitation(lim.value)}
                    disabled={fieldsLocked}
                  />
                  <span className="text-xs">{lim.label}</span>
                </label>
              ))}
            </div>
          </div>

          {!isEditMode && assessment && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${LEVEL_COLORS[assessment.derivedLevel] ?? ""}`}>
                  {assessment.derivedLevel.charAt(0).toUpperCase() + assessment.derivedLevel.slice(1)}
                </Badge>
                <span className="text-xs font-medium">
                  {MODEL_LABELS[assessment.recommendedModel] ?? assessment.recommendedModel}
                </span>
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
            disabled={saving || (isEditMode ? !canSubmitEdit : !canSubmitCreate)}
          >
            {saving ? "Saving…" : isEditMode ? "Save changes" : "Create training plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
