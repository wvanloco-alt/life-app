"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, MoreVertical, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { getGradesForSystem } from "@/lib/grades";
import type { ActivityType, ActivityLog, Goal } from "@/types";
import { LucideIcon } from "@/components/ui/lucide-icon";

export function WorkoutLog() {
  const [activityTypesList, setActivityTypesList] = useState<ActivityType[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSportId, setSelectedSportId] = useState<string>("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [calories, setCalories] = useState("");
  const [steps, setSteps] = useState("");
  const [variant, setVariant] = useState("");
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  // "none" represents an unset linked goal; resolved to `null` on submit.
  const [goalId, setGoalId] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  const selectedActivityType = activityTypesList.find(
    (s) => s.id === parseInt(selectedSportId)
  );

  // FR-1.1: filter the linked-goal picker by the currently-selected activity
  // type. Keyed on the primitive `selectedSportId` (not the derived
  // `selectedActivityType` object) so the memo stays deterministic even if
  // `activityTypesList` is refetched.
  const filteredGoals = useMemo(() => {
    const sportIdNum = parseInt(selectedSportId, 10);
    if (Number.isNaN(sportIdNum)) return activeGoals;
    return activeGoals.filter((g) => g.activityTypeId === sportIdNum);
  }, [activeGoals, selectedSportId]);

  // FR-1.4 / FR-1.5: when the user changes activity type and the currently
  // selected goal no longer matches the new type, silently reset goalId to
  // "none". Done in the Select's onValueChange callback rather than an
  // effect so we don't add a new react-hooks/set-state-in-effect warning.
  const handleActivityTypeChange = (newSportId: string) => {
    setSelectedSportId(newSportId);
    if (goalId === "none") return;
    const newSportIdNum = parseInt(newSportId, 10);
    if (Number.isNaN(newSportIdNum)) return;
    const currentGoal = activeGoals.find((g) => g.id.toString() === goalId);
    if (currentGoal && currentGoal.activityTypeId !== newSportIdNum) {
      setGoalId("none");
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [typesRes, logsRes, goalsRes] = await Promise.all([
      fetch("/api/activity-types"),
      fetch("/api/activity-logs?limit=20"),
      fetch("/api/goals?status=active"),
    ]);
    const [typesData, logsData, goalsData] = await Promise.all([
      typesRes.json(),
      logsRes.json(),
      goalsRes.json(),
    ]);
    setActivityTypesList(typesData);
    setRecentLogs(logsData);
    // Defensive: ignore goals already marked completed even if status is
    // still "active". Matches the daily/weekly views' implicit assumption.
    setActiveGoals(
      (goalsData as Goal[]).filter((g) => !g.isCompleted)
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedActivityType) return;

    if (
      selectedActivityType.variants &&
      selectedActivityType.variants.length > 0 &&
      !variant
    ) {
      setVariant(selectedActivityType.variants[0].key);
    }

    const activeVariant = selectedActivityType.variants?.find(
      (v) => v.key === variant
    );

    if (activeVariant) {
      setCalories(activeVariant.defaultCalories.toString());
      setSteps(activeVariant.defaultSteps.toString());
    } else if (!selectedActivityType.isTracked) {
      setCalories(selectedActivityType.defaultCalories?.toString() ?? "");
      setSteps(selectedActivityType.defaultSteps?.toString() ?? "");
    } else {
      setCalories("");
      setSteps("");
    }

    const newMetrics: Record<string, string> = {};
    for (const m of selectedActivityType.metricsConfig) {
      newMetrics[m.key] = metrics[m.key] ?? "";
    }
    setMetrics(newMetrics);
  }, [selectedSportId, variant]);

  async function handleSave() {
    if (!selectedActivityType) return;
    const totalMinutes = parseInt(hours || "0") * 60 + parseInt(minutes || "0");
    if (totalMinutes <= 0) return;

    setSaving(true);

    const parsedMetrics: Record<string, string | number> = {};
    for (const m of selectedActivityType.metricsConfig) {
      const val = metrics[m.key];
      if (val) {
        parsedMetrics[m.key] = m.type === "number" ? parseFloat(val) : val;
      }
    }

    await fetch("/api/activity-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityTypeId: selectedActivityType.id,
        date,
        durationMinutes: totalMinutes,
        calories: calories ? parseInt(calories) : null,
        steps: steps ? parseInt(steps) : null,
        variant: variant || null,
        metrics: parsedMetrics,
        notes,
        goalId: goalId !== "none" ? parseInt(goalId) : null,
      }),
    });

    setHours("1");
    setMinutes("0");
    setNotes("");
    setMetrics({});
    setGoalId("none");
    setSaving(false);
    await fetchData();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/activity-logs/${id}`, { method: "DELETE" });
    await fetchData();
  }

  const grades = selectedActivityType?.gradeSystem
    ? getGradesForSystem(selectedActivityType.gradeSystem)
    : [];

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (activityTypesList.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Define your activity types first, then come back to log activities.
          </p>
          <Button variant="link" className="mt-2" asChild>
            <a href="/activity-types">Go to Activity Types &rarr;</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No workouts logged yet. Use the form to add your first one.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((w) => {
                  const hrs = Math.floor(w.durationMinutes / 60);
                  const mins = w.durationMinutes % 60;
                  const metricEntries = Object.entries(w.metrics).filter(
                    ([, v]) => v !== "" && v !== null
                  );
                  return (
                    <div
                      key={w.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <LucideIcon name={w.activityTypeIcon ?? "activity"} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {w.activityTypeName}
                          {w.variant && (
                            <span className="text-muted-foreground ml-1">
                              ({w.variant})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>
                            {format(
                              new Date(w.date + "T00:00:00"),
                              "EEE, MMM d"
                            )}
                          </span>
                          <span>
                            {hrs > 0 ? `${hrs}h ` : ""}
                            {mins > 0 ? `${mins}m` : ""}
                          </span>
                          {w.calories && <span>{w.calories} cal</span>}
                        </div>
                        {metricEntries.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {metricEntries.map(([key, val]) => (
                              <Badge
                                key={key}
                                variant="secondary"
                                className="text-xs"
                              >
                                {val}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {w.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {w.notes}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDelete(w.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <Plus className="inline mr-1.5 h-4 w-4" />
            Log Workout
          </CardTitle>
          <CardDescription>
            Select a sport and fill in your session details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Select value={selectedSportId} onValueChange={handleActivityTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pick an activity type..." />
              </SelectTrigger>
              <SelectContent>
                {activityTypesList.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    <span className="flex items-center gap-2"><LucideIcon name={s.icon} size="sm" />{s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedActivityType && (
            <>
              {filteredGoals.length > 0 && (
                <div className="space-y-2">
                  <Label>Linked Goal (optional)</Label>
                  <Select value={goalId} onValueChange={setGoalId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No linked goal</SelectItem>
                      {filteredGoals.map((g) => (
                        <SelectItem key={g.id} value={g.id.toString()}>
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {selectedActivityType.variants &&
                selectedActivityType.variants.length > 0 && (
                  <div className="space-y-2">
                    <Label>Variant</Label>
                    <Select value={variant} onValueChange={setVariant}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedActivityType.variants.map((v) => (
                          <SelectItem key={v.key} value={v.key}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Hours
                    </Label>
                    <Input
                      type="number"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      min={0}
                      max={12}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Minutes
                    </Label>
                    <Input
                      type="number"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      min={0}
                      max={59}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Calories</Label>
                  <Input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="cal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Steps</Label>
                  <Input
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    placeholder="steps"
                  />
                </div>
              </div>

              {selectedActivityType.metricsConfig.map((m) => (
                <div key={m.key} className="space-y-1">
                  <Label className="text-xs">{m.label}</Label>
                  {m.key === "max_grade" && grades.length > 0 ? (
                    <Select
                      value={metrics[m.key] ?? ""}
                      onValueChange={(v) =>
                        setMetrics({ ...metrics, [m.key]: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={m.type === "number" ? "number" : "text"}
                      value={metrics[m.key] ?? ""}
                      onChange={(e) =>
                        setMetrics({ ...metrics, [m.key]: e.target.value })
                      }
                      placeholder={m.label}
                    />
                  )}
                </div>
              ))}

              <div className="space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did it feel?"
                  rows={2}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !selectedActivityType}
                className="w-full"
              >
                {saving ? "Saving..." : "Log Workout"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
