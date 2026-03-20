"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, X } from "lucide-react";
import type { ActivityType, MetricField, ActivityVariant } from "@/types";

const ACTIVITY_ICONS = ["🏃", "🥾", "🎾", "🧗", "⛰️", "🚴", "🏊", "⚽", "🏀", "🏋️", "🧘", "🎿", "🏄", "📖", "📝", "🤝"];

interface ActivityTypeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ActivityType>) => void;
  activityType?: ActivityType | null;
}

export function ActivityTypeForm({ open, onClose, onSave, activityType }: ActivityTypeFormProps) {
  const [name, setName] = useState(activityType?.name ?? "");
  const [type, setType] = useState(activityType?.type ?? "cardio");
  const [icon, setIcon] = useState(activityType?.icon ?? "🏃");
  const [isTracked, setIsTracked] = useState(activityType?.isTracked ?? false);
  const [defaultCalories, setDefaultCalories] = useState(
    activityType?.defaultCalories?.toString() ?? ""
  );
  const [defaultSteps, setDefaultSteps] = useState(
    activityType?.defaultSteps?.toString() ?? ""
  );
  const [metricsConfig, setMetricsConfig] = useState<MetricField[]>(
    activityType?.metricsConfig ?? []
  );
  const [variants, setVariants] = useState<ActivityVariant[]>(
    activityType?.variants ?? []
  );
  const [gradeSystem, setGradeSystem] = useState(activityType?.gradeSystem ?? "");
  const [error, setError] = useState("");

  const isEditing = !!activityType;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError("");
    onSave({
      name: name.trim(),
      type: type as ActivityType["type"],
      icon,
      isTracked,
      defaultCalories: defaultCalories ? parseInt(defaultCalories) : null,
      defaultSteps: defaultSteps ? parseInt(defaultSteps) : null,
      metricsConfig,
      variants: variants.length > 0 ? variants : null,
      gradeSystem: gradeSystem || null,
    });
  }

  function addMetric() {
    setMetricsConfig([
      ...metricsConfig,
      { key: "", label: "", type: "number" },
    ]);
  }

  function removeMetric(index: number) {
    setMetricsConfig(metricsConfig.filter((_, i) => i !== index));
  }

  function updateMetric(index: number, field: Partial<MetricField>) {
    setMetricsConfig(
      metricsConfig.map((m, i) => {
        if (i !== index) return m;
        const updated = { ...m, ...field };
        if (field.label && !m.key) {
          updated.key = field.label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "");
        }
        return updated;
      })
    );
  }

  function addVariant() {
    setVariants([
      ...variants,
      { key: "", label: "", defaultCalories: 0, defaultSteps: 0 },
    ]);
  }

  function removeVariant(index: number) {
    setVariants(variants.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: Partial<ActivityVariant>) {
    setVariants(
      variants.map((v, i) => {
        if (i !== index) return v;
        const updated = { ...v, ...field };
        if (field.label && !v.key) {
          updated.key = field.label.toLowerCase().replace(/\s+/g, "_");
        }
        return updated;
      })
    );
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setError("");
      setName(activityType?.name ?? "");
      setType(activityType?.type ?? "cardio");
      setIcon(activityType?.icon ?? "🏃");
      setIsTracked(activityType?.isTracked ?? false);
      setDefaultCalories(activityType?.defaultCalories?.toString() ?? "");
      setDefaultSteps(activityType?.defaultSteps?.toString() ?? "");
      setMetricsConfig(activityType?.metricsConfig ?? []);
      setVariants(activityType?.variants ?? []);
      setGradeSystem(activityType?.gradeSystem ?? "");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Activity Type" : "Add Activity Type"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="activity-type-name">Name</Label>
              <Input
                id="activity-type-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Running, Tennis"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_ICONS.map((ic) => (
                    <SelectItem key={ic} value={ic}>
                      {ic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ActivityType["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Grade System</Label>
              <Select
                value={gradeSystem || "none"}
                onValueChange={(v) => setGradeSystem(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="french">French (climbing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={isTracked}
              onCheckedChange={(v) => setIsTracked(v as boolean)}
            />
            <div>
              <span className="text-sm">Tracked with a device</span>
              <p className="text-xs text-muted-foreground">
                Calories and steps come from your watch/phone
              </p>
            </div>
          </label>

          {!isTracked && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Default Calories</Label>
                <Input
                  type="number"
                  value={defaultCalories}
                  onChange={(e) => setDefaultCalories(e.target.value)}
                  placeholder="e.g., 400"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default Steps</Label>
                <Input
                  type="number"
                  value={defaultSteps}
                  onChange={(e) => setDefaultSteps(e.target.value)}
                  placeholder="e.g., 5000"
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Custom Metrics
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMetric}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
            {metricsConfig.map((m, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Label (e.g., Distance km)"
                    value={m.label}
                    onChange={(e) =>
                      updateMetric(i, { label: e.target.value })
                    }
                  />
                </div>
                <Select
                  value={m.type}
                  onValueChange={(v) =>
                    updateMetric(i, { type: v as "number" | "text" })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => removeMetric(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Variants
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sub-types with different calorie/step defaults (e.g., singles vs doubles)
            </p>
            {variants.map((v, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Label (e.g., Singles)"
                    value={v.label}
                    onChange={(e) =>
                      updateVariant(i, { label: e.target.value })
                    }
                  />
                </div>
                <Input
                  type="number"
                  className="w-20"
                  placeholder="Cal"
                  value={v.defaultCalories || ""}
                  onChange={(e) =>
                    updateVariant(i, {
                      defaultCalories: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  type="number"
                  className="w-20"
                  placeholder="Steps"
                  value={v.defaultSteps || ""}
                  onChange={(e) =>
                    updateVariant(i, {
                      defaultSteps: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => removeVariant(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Save Changes" : "Create Activity Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
