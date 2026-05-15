"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HabitDraft } from "@/types";
import { useState } from "react";

const PRESET_COLORS = [
  "#c2700f", // amber
  "#b45309", // warm brown
  "#92400e", // deep amber
  "#7c3aed", // violet
  "#be185d", // rose
  "#0369a1", // sky
  "#047857", // emerald
  "#374151", // slate
];

const WALKTHROUGH_STEPS = [
  {
    id: "identity" as const,
    label: "Who do you want to be?",
    subtitle: "Habits are votes for the identity you want to build.",
    placeholder: "I am someone who moves their body every day.",
    field: "identity" as keyof HabitDraft,
    required: true,
    multiline: true,
  },
  {
    id: "name" as const,
    label: "What's the habit?",
    subtitle: "Name it simply. You'll know it when you see it.",
    placeholder: "Morning run",
    field: "name" as keyof HabitDraft,
    required: true,
    multiline: false,
  },
  {
    id: "cue" as const,
    label: "What triggers it?",
    subtitle: "Habit stacking: after [current habit], I will [new habit].",
    placeholder: "After I make coffee",
    field: "cue" as keyof HabitDraft,
    required: false,
    multiline: false,
  },
  {
    id: "minimumVersion" as const,
    label: "What's the two-minute version?",
    subtitle: "The version so easy you can't say no. Show up, even briefly.",
    placeholder: "Put on my shoes and step outside",
    field: "minimumVersion" as keyof HabitDraft,
    required: false,
    multiline: false,
  },
] as const;

type WalkthroughStep = (typeof WALKTHROUGH_STEPS)[number]["id"] | "review";

interface HabitFormProps {
  open: boolean;
  mode: "quick" | "walkthrough";
  onClose: () => void;
  onCreated: (habit: { id: number; name: string }) => void;
}

async function createHabit(draft: HabitDraft): Promise<{ id: number; name: string }> {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to create habit");
  }
  return res.json();
}

export function HabitForm({ open, mode, onClose, onCreated }: HabitFormProps) {
  const [draft, setDraft] = useState<Partial<HabitDraft>>({
    color: PRESET_COLORS[0],
  });
  const [walkthroughStep, setWalkthroughStep] = useState<WalkthroughStep>("identity");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDraft({ color: PRESET_COLORS[0] });
    setWalkthroughStep("identity");
    setSubmitting(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function patch(field: keyof HabitDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function submit() {
    if (!draft.name?.trim() || !draft.identity?.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createHabit(draft as HabitDraft);
      reset();
      onCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  // ─── Quick mode ──────────────────────────────────────────────────────────────

  if (mode === "quick") {
    const canSubmit =
      (draft.name?.trim().length ?? 0) > 0 &&
      (draft.identity?.trim().length ?? 0) > 0;

    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-base">Add a habit</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-identity">Identity</Label>
              <Textarea
                id="q-identity"
                rows={2}
                placeholder="I am someone who…"
                value={draft.identity ?? ""}
                onChange={(e) => patch("identity", e.target.value)}
                maxLength={200}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-name">Habit name</Label>
              <Input
                id="q-name"
                placeholder="Morning run"
                value={draft.name ?? ""}
                onChange={(e) => patch("name", e.target.value)}
                maxLength={80}
              />
            </div>

            {/* Color */}
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <ColorPicker selected={draft.color ?? PRESET_COLORS[0]} onChange={(c) => patch("color", c)} />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? "Saving…" : "Save habit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Walkthrough mode ─────────────────────────────────────────────────────────

  const currentStepIdx = WALKTHROUGH_STEPS.findIndex((s) => s.id === walkthroughStep);
  const isReview = walkthroughStep === "review";
  const totalSteps = WALKTHROUGH_STEPS.length + 1; // +1 for review

  function nextStep() {
    if (currentStepIdx < WALKTHROUGH_STEPS.length - 1) {
      setWalkthroughStep(WALKTHROUGH_STEPS[currentStepIdx + 1].id);
    } else {
      setWalkthroughStep("review");
    }
  }

  function prevStep() {
    if (isReview) {
      setWalkthroughStep(WALKTHROUGH_STEPS[WALKTHROUGH_STEPS.length - 1].id);
    } else if (currentStepIdx > 0) {
      setWalkthroughStep(WALKTHROUGH_STEPS[currentStepIdx - 1].id);
    }
  }

  const stepNumber = isReview ? totalSteps : currentStepIdx + 1;
  const currentStep = isReview ? null : WALKTHROUGH_STEPS[currentStepIdx];
  const currentValue = currentStep ? (draft[currentStep.field] ?? "") : "";
  const canProceed =
    !currentStep?.required || (currentValue as string).trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-base">
              {isReview ? "Review your habit" : currentStep?.label}
            </DialogTitle>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {stepNumber}/{totalSteps}
            </span>
          </div>
        </DialogHeader>

        {/* Step indicator dots */}
        <div className="flex gap-1.5 -mt-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-colors duration-200 ${
                i < stepNumber ? "bg-foreground/60" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4 mt-2">
          {/* ── Step content ── */}
          {!isReview && currentStep && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              {currentStep.subtitle && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentStep.subtitle}
                </p>
              )}
              {currentStep.multiline ? (
                <Textarea
                  rows={3}
                  placeholder={currentStep.placeholder}
                  value={currentValue as string}
                  onChange={(e) => patch(currentStep.field, e.target.value)}
                  maxLength={200}
                  className="resize-none text-sm"
                  autoFocus
                />
              ) : (
                <Input
                  placeholder={currentStep.placeholder}
                  value={currentValue as string}
                  onChange={(e) => patch(currentStep.field, e.target.value)}
                  maxLength={currentStep.field === "name" ? 80 : 200}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canProceed) nextStep();
                  }}
                />
              )}
            </div>
          )}

          {/* ── Review ── */}
          {isReview && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <ReviewRow
                label="Identity"
                value={draft.identity}
                onEdit={() => setWalkthroughStep("identity")}
              />
              <ReviewRow
                label="Name"
                value={draft.name}
                onEdit={() => setWalkthroughStep("name")}
              />
              {draft.cue && (
                <ReviewRow
                  label="Cue"
                  value={draft.cue}
                  onEdit={() => setWalkthroughStep("cue")}
                />
              )}
              {draft.minimumVersion && (
                <ReviewRow
                  label="Two-minute version"
                  value={draft.minimumVersion}
                  onEdit={() => setWalkthroughStep("minimumVersion")}
                />
              )}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Color</span>
                <ColorPicker
                  selected={draft.color ?? PRESET_COLORS[0]}
                  onChange={(c) => patch("color", c)}
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* ── Navigation ── */}
          <div className="flex items-center gap-2 justify-between pt-1">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={prevStep} disabled={currentStepIdx === 0 && !isReview}>
                Back
              </Button>
              {!currentStep?.required && !isReview && (
                <Button variant="ghost" size="sm" onClick={nextStep} className="text-muted-foreground">
                  Skip
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {!isReview && (
                <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground text-xs">
                  Cancel
                </Button>
              )}
              {isReview ? (
                <Button
                  size="sm"
                  onClick={submit}
                  disabled={submitting || !draft.name?.trim() || !draft.identity?.trim()}
                >
                  {submitting ? "Saving…" : "Create habit"}
                </Button>
              ) : (
                <Button size="sm" onClick={nextStep} disabled={!canProceed}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ColorPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={selected === color}
          onClick={() => onChange(color)}
          className={`w-6 h-6 rounded-full transition-all duration-150 hover:scale-110 active:scale-95 ${
            selected === color
              ? "ring-2 ring-offset-2 ring-foreground/40 scale-110"
              : ""
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value?: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm leading-snug">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
      >
        Edit
      </button>
    </div>
  );
}
