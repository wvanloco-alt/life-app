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
import type { LevelAssessment, TennisPlayingStyle, PhysicalLimitation } from "@/types";
import { format } from "date-fns";

interface TennisTrainingPlanDialogProps {
  open: boolean;
  onClose: () => void;
  goalId: number;
  goalTitle: string;
  onCreated: () => void;
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  club: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  advanced: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const MODEL_LABELS: Record<string, string> = {
  "3-1": "3-1 cycle (4 weeks)",
  "3-3-2-1": "3-3-2-1 cycle (9 weeks)",
  "3-2-1": "3-2-1 cycle (6 weeks)",
};

const SELF_RATINGS = [
  { value: "beginner", label: "Beginner", desc: "New to tennis or returning after a long break" },
  { value: "club", label: "Club Player", desc: "Play regularly at club level, 2-3x/week" },
  { value: "advanced", label: "Advanced", desc: "Experienced competitor, 3+/week" },
] as const;

const PLAYING_STYLES: { value: TennisPlayingStyle; label: string; icon: string }[] = [
  { value: "baseliner", label: "Baseliner", icon: "🎯" },
  { value: "all-court", label: "All-Court", icon: "🏃" },
  { value: "serve-volley", label: "Serve & Volley", icon: "⚡" },
];

const LIMITATIONS: { value: PhysicalLimitation; label: string }[] = [
  { value: "shoulder", label: "Shoulder" },
  { value: "back", label: "Back" },
  { value: "knee", label: "Knee" },
  { value: "elbow", label: "Elbow (Tennis Elbow)" },
  { value: "ankle", label: "Ankle / Achilles" },
  { value: "adductor", label: "Adductor / Groin" },
];

export function TennisTrainingPlanDialog({
  open,
  onClose,
  goalId,
  goalTitle,
  onCreated,
}: TennisTrainingPlanDialogProps) {
  const [selfRating, setSelfRating] = useState<string>("club");
  const [yearsPlaying, setYearsPlaying] = useState(3);
  const [matchesPerWeek, setMatchesPerWeek] = useState(2);
  const [playingStyle, setPlayingStyle] = useState<TennisPlayingStyle>("all-court");
  const [physicalLimitations, setPhysicalLimitations] = useState<PhysicalLimitation[]>([]);
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
          body: JSON.stringify({ sport: "tennis", selfRating, yearsPlaying }),
        });
        if (res.ok) setAssessment(await res.json());
      } catch { /* ignore */ }
    }, 150);
    return () => clearTimeout(timer);
  }, [open, selfRating, yearsPlaying]);

  function toggleLimitation(lim: PhysicalLimitation) {
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
          sport: "tennis",
          yearsExperience: yearsPlaying,
          startDate,
          sportProfile: {
            selfRating,
            playingStyle,
            matchesPerWeek,
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
            🎾 Tennis Training Plan
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{goalTitle}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Self-Rating */}
          <div className="space-y-1.5">
            <Label className="text-xs">Level</Label>
            <div className="flex gap-2">
              {SELF_RATINGS.map((r) => (
                <Button
                  key={r.value}
                  type="button"
                  variant={selfRating === r.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setSelfRating(r.value)}
                  title={r.desc}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Years + Matches + Start Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Years Playing</Label>
              <Input
                type="number"
                min={0}
                max={40}
                value={yearsPlaying}
                onChange={(e) => setYearsPlaying(Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Matches/Week</Label>
              <Input
                type="number"
                min={0}
                max={7}
                value={matchesPerWeek}
                onChange={(e) => setMatchesPerWeek(Number(e.target.value))}
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

          {/* Playing Style */}
          <div className="space-y-1.5">
            <Label className="text-xs">Playing Style</Label>
            <div className="flex gap-2">
              {PLAYING_STYLES.map((s) => (
                <Button
                  key={s.value}
                  type="button"
                  variant={playingStyle === s.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setPlayingStyle(s.value)}
                >
                  {s.icon} {s.label}
                </Button>
              ))}
            </div>
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
