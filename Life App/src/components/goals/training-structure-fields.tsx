"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { defaultSplit, isValidSplit } from "@/lib/training/split";

// Day ordering used when generating an even spread from scratch:
// Mon/Wed/Fri first (classic training days), then Tue/Sat, then Thu/Sun.
const SPREAD_ORDER = [1, 3, 5, 2, 6, 4, 7];

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrainingStructureValue {
  trainingSessionsPerWeek: number;
  supplementalSessionsPerWeek: number;
  trainingPreferredDays: number[];
  supplementalPreferredDays: number[];
}

interface TrainingStructureFieldsProps {
  /** Total sessions/week from the goal — split must sum to this. */
  sessionsPerWeek: number;
  value: TrainingStructureValue;
  onChange: (v: TrainingStructureValue) => void;
}

// ─── Pure helper ─────────────────────────────────────────────────────────────

/**
 * Derive a sensible default TrainingStructureValue for a new plan.
 *
 * Algorithm (D1 from scope.md):
 * 1. Compute training/supplemental counts via defaultSplit(sessionsPerWeek).
 * 2. If goalPreferredDays is non-empty, distribute them: first `training` entries
 *    → trainingPreferredDays, next `supplemental` entries → supplementalPreferredDays.
 *    If fewer goal days than total sessions, fill remaining slots by cycling 1–7
 *    (Mon–Sun order), skipping already-assigned days.
 * 3. If goalPreferredDays is empty/null, cycle through SPREAD_ORDER and assign
 *    the first `training` days to training and next `supplemental` to supplemental,
 *    never sharing a day between the two arrays.
 *
 * Days are 1–7 (Mon=1 … Sun=7), matching trainingPlans.*PreferredDays encoding (BR-003).
 */
export function deriveDefaultStructure(
  sessionsPerWeek: number,
  goalPreferredDays: number[] | null
): TrainingStructureValue {
  const { training, supplemental } = defaultSplit(sessionsPerWeek);

  const trainingPreferredDays: number[] = [];
  const supplementalPreferredDays: number[] = [];

  if (goalPreferredDays && goalPreferredDays.length > 0) {
    // Sort goal days Mon→Sun for deterministic assignment
    const sorted = [...goalPreferredDays].sort((a, b) => a - b);

    // Assign training days first
    for (let i = 0; i < training && i < sorted.length; i++) {
      trainingPreferredDays.push(sorted[i]);
    }
    // Then supplemental from the remainder of the goal days
    for (
      let i = training;
      i < training + supplemental && i < sorted.length;
      i++
    ) {
      supplementalPreferredDays.push(sorted[i]);
    }

    // If we didn't get enough days from the goal, fill with spread-order days
    // that aren't already assigned.
    const assigned = new Set([...trainingPreferredDays, ...supplementalPreferredDays]);
    const fallback = SPREAD_ORDER.filter((d) => !assigned.has(d));
    let fi = 0;

    while (trainingPreferredDays.length < training && fi < fallback.length) {
      trainingPreferredDays.push(fallback[fi++]);
    }
    while (supplementalPreferredDays.length < supplemental && fi < fallback.length) {
      supplementalPreferredDays.push(fallback[fi++]);
    }
  } else {
    // No goal days — generate from scratch using SPREAD_ORDER
    let si = 0;
    while (trainingPreferredDays.length < training && si < SPREAD_ORDER.length) {
      trainingPreferredDays.push(SPREAD_ORDER[si++]);
    }
    while (supplementalPreferredDays.length < supplemental && si < SPREAD_ORDER.length) {
      supplementalPreferredDays.push(SPREAD_ORDER[si++]);
    }
  }

  return {
    trainingSessionsPerWeek: training,
    supplementalSessionsPerWeek: supplemental,
    trainingPreferredDays,
    supplementalPreferredDays,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Shared split editor + dual preferred-day pickers.
 * Used by all three training plan creation dialogs (climbing, tennis, running)
 * and the post-creation edit dialog (PR B).
 *
 * Controlled: the parent owns state via `value` / `onChange`.
 */
export function TrainingStructureFields({
  sessionsPerWeek,
  value,
  onChange,
}: TrainingStructureFieldsProps) {
  const { trainingSessionsPerWeek, supplementalSessionsPerWeek } = value;
  const splitValid = isValidSplit(
    trainingSessionsPerWeek,
    supplementalSessionsPerWeek,
    sessionsPerWeek
  );

  const trainingDays = new Set(value.trainingPreferredDays);
  const supplementalDays = new Set(value.supplementalPreferredDays);

  function handleTrainingCount(raw: string) {
    const n = parseInt(raw, 10);
    onChange({ ...value, trainingSessionsPerWeek: isNaN(n) ? 0 : n });
  }

  function handleSupplementalCount(raw: string) {
    const n = parseInt(raw, 10);
    onChange({ ...value, supplementalSessionsPerWeek: isNaN(n) ? 0 : n });
  }

  function toggleTraining(day: number) {
    const next = new Set(trainingDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange({ ...value, trainingPreferredDays: [...next].sort((a, b) => a - b) });
  }

  function toggleSupplemental(day: number) {
    const next = new Set(supplementalDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange({ ...value, supplementalPreferredDays: [...next].sort((a, b) => a - b) });
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      {/* Split counts */}
      <div>
        <Label className="text-xs font-medium">Weekly session split</Label>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Must sum to{" "}
          <span className="font-medium text-foreground">{sessionsPerWeek}</span>{" "}
          (this goal&apos;s sessions/week).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tsf-training" className="text-xs">
            Training sessions/week
          </Label>
          <Input
            id="tsf-training"
            type="number"
            min={0}
            className={`h-9 ${
              !splitValid && trainingSessionsPerWeek >= 0 ? "border-destructive" : ""
            }`}
            value={trainingSessionsPerWeek}
            onChange={(e) => handleTrainingCount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tsf-supplemental" className="text-xs">
            Supplemental sessions/week
          </Label>
          <Input
            id="tsf-supplemental"
            type="number"
            min={0}
            className={`h-9 ${
              !splitValid && supplementalSessionsPerWeek >= 0 ? "border-destructive" : ""
            }`}
            value={supplementalSessionsPerWeek}
            onChange={(e) => handleSupplementalCount(e.target.value)}
          />
        </div>
      </div>
      {!splitValid ? (
        <p className="text-xs text-destructive">
          Training + supplemental must equal {sessionsPerWeek}.
        </p>
      ) : null}
      {sessionsPerWeek === 2 ? (
        <p className="text-xs text-muted-foreground">
          The source material recommends supplemental work alongside training. If
          your schedule allows more than 2 sessions per week, the default will add
          supplemental sessions automatically.
        </p>
      ) : null}

      {/* Preferred days */}
      <PreferredDayRow
        label="Training preferred days"
        subtitle="Days you prefer sport-specific sessions."
        selected={trainingDays}
        onToggle={toggleTraining}
      />
      <PreferredDayRow
        label="Supplemental preferred days"
        subtitle="Gym / cross-training sessions. Avoid overlap with training days."
        selected={supplementalDays}
        onToggle={toggleSupplemental}
      />
    </div>
  );
}
