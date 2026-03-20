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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Mountain, Info } from "lucide-react";
import type { LevelAssessment, Discipline, ClimbingLimitation } from "@/types";
import { GRADE_ORDER } from "@/lib/training/periodization";
import { format } from "date-fns";

interface TrainingPlanDialogProps {
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
  onCreated,
}: TrainingPlanDialogProps) {
  const [discipline, setDiscipline] = useState<Discipline>("bouldering");
  const [maxBoulderGrade, setMaxBoulderGrade] = useState("5c");
  const [maxSportGrade, setMaxSportGrade] = useState("6a");
  const [yearsExperience, setYearsExperience] = useState(2);
  const [physicalLimitations, setPhysicalLimitations] = useState<ClimbingLimitation[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [assessment, setAssessment] = useState<LevelAssessment | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleLimitation(lim: ClimbingLimitation) {
    setPhysicalLimitations((prev) =>
      prev.includes(lim) ? prev.filter((l) => l !== lim) : [...prev, lim]
    );
  }

  useEffect(() => {
    if (!open) return;
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
      } catch { /* ignore */ }
    }, 150);
    return () => clearTimeout(timer);
  }, [open, maxBoulderGrade, maxSportGrade, yearsExperience]);

  async function handleSubmit() {
    setSaving(true);
    try {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mountain className="h-4 w-4" />
            Training Plan
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{goalTitle}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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
                >
                  {d === "bouldering" ? "🧗 Bouldering" : "🧗‍♂️ Sport Climbing"}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Boulder Grade</Label>
              <Select value={maxBoulderGrade} onValueChange={setMaxBoulderGrade}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_ORDER.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Hardest grade you send consistently</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Current Sport Grade</Label>
              <Select value={maxSportGrade} onValueChange={setMaxSportGrade}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_ORDER.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
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

          <div className="space-y-1.5">
            <Label className="text-xs">Physical Considerations (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              {CLIMBING_LIMITATIONS.map((lim) => (
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

          {assessment && (
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
            disabled={saving || !assessment}
          >
            {saving ? "Creating..." : "Create Training Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
