"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlanDefaultDurationsSectionProps {
  trainingDuration: string;
  supplementalDuration: string;
  onTrainingDurationChange: (value: string) => void;
  onSupplementalDurationChange: (value: string) => void;
}

export function parseDurationFormField(input: string): number | null | "invalid" {
  if (input.trim() === "") return null;
  const n = parseInt(input, 10);
  return Number.isInteger(n) && n > 0 ? n : "invalid";
}

export function PlanDefaultDurationsSection({
  trainingDuration,
  supplementalDuration,
  onTrainingDurationChange,
  onSupplementalDurationChange,
}: PlanDefaultDurationsSectionProps) {
  const trainingInvalid =
    trainingDuration.trim() !== "" && parseDurationFormField(trainingDuration) === "invalid";
  const supplementalInvalid =
    supplementalDuration.trim() !== "" &&
    parseDurationFormField(supplementalDuration) === "invalid";

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      <div>
        <Label className="text-xs font-medium">Default session durations</Label>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Used when you check off a scheduled activity. Leave blank to use the activity type
          default.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="plan-default-training-duration" className="text-xs">
            Training session (min)
          </Label>
          <Input
            id="plan-default-training-duration"
            type="number"
            min={1}
            placeholder="Optional"
            className={`h-9 ${trainingInvalid ? "border-destructive" : ""}`}
            value={trainingDuration}
            onChange={(e) => onTrainingDurationChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plan-default-supplemental-duration" className="text-xs">
            Supplemental session (min)
          </Label>
          <Input
            id="plan-default-supplemental-duration"
            type="number"
            min={1}
            placeholder="Optional"
            className={`h-9 ${supplementalInvalid ? "border-destructive" : ""}`}
            value={supplementalDuration}
            onChange={(e) => onSupplementalDurationChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
