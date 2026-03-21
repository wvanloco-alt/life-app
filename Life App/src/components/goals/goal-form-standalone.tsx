"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Check, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Goal, Role, ActivityType, TargetPeriod, GoalHorizon } from "@/types";
import { GRADE_ORDER } from "@/lib/training/periodization";
import { LucideIcon } from "@/components/ui/lucide-icon";
import { format } from "date-fns";

export interface GoalFormPayload {
  title: string;
  description: string;
  roleIds: number[];
  targetDate: string;
  sessionsPerWeek: number;
  activityTypeId?: number | null;
  targetMetric?: string | null;
  targetValue?: number | null;
  targetPeriod?: TargetPeriod | null;
  targetUnit?: string | null;
  horizon?: GoalHorizon | null;
  parentGoalId?: number | null;
  month?: string | null;
  autoGenerate?: { enabled: boolean; mode: "whole_year" | "from_now" };
  preferredDays?: string | null;
  preferredTimeSlot?: string | null;
  sessionPatterns?: { label: string; restDaysAfter: number }[];
  createTrainingPlan?: boolean;
}

interface GoalFormStandaloneProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: GoalFormPayload) => void;
  roles: Role[];
  goal?: Goal | null;
  yearlyGoals?: Goal[];
}

export function GoalFormStandalone({
  open,
  onClose,
  onSave,
  roles,
  goal,
  yearlyGoals = [],
}: GoalFormStandaloneProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
  const [targetDate, setTargetDate] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("3");
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [activityTypeId, setActivityTypeId] = useState<string>("");
  const [targetMetric, setTargetMetric] = useState<string>("");
  const [targetValue, setTargetValue] = useState("");
  const [targetPeriod, setTargetPeriod] = useState<TargetPeriod>("weekly");
  const [targetUnit, setTargetUnit] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon | "standalone">("yearly");
  const [month, setMonth] = useState("");
  const [parentGoalId, setParentGoalId] = useState<string>("");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [autoGenerateMode, setAutoGenerateMode] = useState<"whole_year" | "from_now">("whole_year");
  const [preferredDays, setPreferredDays] = useState<Set<number>>(new Set());
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<string>("");
  const [sessionPatterns, setSessionPatterns] = useState<{ label: string; restDaysAfter: number }[]>([]);
  const [showPatterns, setShowPatterns] = useState(false);
  const [createTrainingPlan, setCreateTrainingPlan] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!goal;
  const selectedActivityType = activityTypes.find(
    (at) => at.id === parseInt(activityTypeId)
  );
  const hasGradeSystem = !!selectedActivityType?.gradeSystem;

  const targetMetricOptions = [
    { value: "sessions", label: "Sessions" },
    { value: "duration", label: "Total Duration (minutes)" },
    ...(selectedActivityType?.metricsConfig?.map((m) => ({
      value: m.key,
      label: m.label,
    })) ?? []),
  ];

  useEffect(() => {
    if (open) {
      fetch("/api/activity-types")
        .then((r) => r.json())
        .then(setActivityTypes);

      if (goal?.id) {
        fetch(`/api/goals/${goal.id}/session-patterns`)
          .then((r) => r.json())
          .then((patterns) => {
            if (Array.isArray(patterns) && patterns.length > 0) {
              setSessionPatterns(patterns.map((p: { label: string; restDaysAfter: number }) => ({
                label: p.label,
                restDaysAfter: p.restDaysAfter,
              })));
              setShowPatterns(true);
            } else {
              setSessionPatterns([]);
              setShowPatterns(false);
            }
          })
          .catch(() => { setSessionPatterns([]); setShowPatterns(false); });
      } else {
        setSessionPatterns([]);
        setShowPatterns(false);
      }
    }
  }, [open, goal?.id]);

  useEffect(() => {
    if (open) {
      setTitle(goal?.title ?? "");
      setDescription(goal?.description ?? "");
      setSelectedRoleIds(
        new Set(goal?.roles?.map((r) => r.id) ?? (roles[0] ? [roles[0].id] : []))
      );
      setSessionsPerWeek(String(goal?.sessionsPerWeek ?? 3));
      setActivityTypeId(goal?.activityTypeId?.toString() ?? "");
      setTargetMetric(goal?.targetMetric ?? "sessions");
      setTargetValue(goal?.targetValue?.toString() ?? "");
      setTargetPeriod((goal?.targetPeriod as TargetPeriod) ?? "weekly");
      setTargetUnit(goal?.targetUnit ?? "");
      setMonth(goal?.month ?? format(new Date(), "yyyy-MM"));
      setParentGoalId(goal?.parentGoalId?.toString() ?? "");
      setAutoGenerate(false);
      setAutoGenerateMode("whole_year");
      const prefDaysStr = goal?.preferredDays;
      setPreferredDays(
        prefDaysStr ? new Set(prefDaysStr.split(",").map(Number)) : new Set()
      );
      setPreferredTimeSlot(goal?.preferredTimeSlot ?? "");
      setError("");

      const h = goal?.horizon ?? "yearly";
      setHorizon(h);

      if (h === "yearly") {
        setTargetDate(goal?.targetDate ?? `${new Date().getFullYear()}-12-31`);
      } else {
        setTargetDate(goal?.targetDate ?? "");
      }
    }
  }, [open, goal, roles]);

  function handleHorizonChange(val: string) {
    const h = val as GoalHorizon | "standalone";
    setHorizon(h);
    if (h === "yearly" && !targetDate) {
      setTargetDate(`${new Date().getFullYear()}-12-31`);
    }
    if (h === "monthly" && !month) {
      setMonth(format(new Date(), "yyyy-MM"));
    }
  }

  function toggleRole(roleId: number) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (selectedRoleIds.size === 0) {
      setError("Select at least one role");
      return;
    }
    if (horizon === "monthly" && !month) {
      setError("Month is required for monthly goals");
      return;
    }
    setError("");

    const payload: GoalFormPayload = {
      title: title.trim(),
      description: description.trim(),
      roleIds: [...selectedRoleIds],
      targetDate,
      sessionsPerWeek: parseInt(sessionsPerWeek) || 3,
      horizon: horizon === "standalone" ? null : horizon,
      targetUnit: targetUnit.trim() || null,
      preferredDays: preferredDays.size > 0
        ? [...preferredDays].sort((a, b) => a - b).join(",")
        : null,
      preferredTimeSlot: preferredTimeSlot || null,
      sessionPatterns: sessionPatterns.length > 0 ? sessionPatterns : undefined,
    };

    if (horizon === "monthly") {
      payload.month = month;
      payload.parentGoalId = parentGoalId ? parseInt(parentGoalId) : null;
    }

    if (horizon === "yearly" && autoGenerate) {
      payload.autoGenerate = { enabled: true, mode: autoGenerateMode };
    }

    if ((horizon === "yearly" || horizon === "standalone") && createTrainingPlan && !isEditing) {
      payload.createTrainingPlan = true;
    }

    if (activityTypeId) {
      payload.activityTypeId = parseInt(activityTypeId);
    }

    if (hasGradeSystem && (horizon === "yearly" || horizon === "monthly")) {
      payload.targetMetric = "grade";
      payload.targetValue = GRADE_ORDER.indexOf(targetUnit) >= 0 ? GRADE_ORDER.indexOf(targetUnit) : null;
      payload.targetUnit = targetUnit || null;
      payload.targetPeriod = null;
    } else if (targetMetric === "sessions") {
      payload.targetMetric = null;
      payload.targetValue = null;
      payload.targetPeriod = null;
    } else {
      payload.targetMetric = targetMetric;
      payload.targetValue = targetValue ? parseFloat(targetValue) : null;
      payload.targetPeriod = targetPeriod;
    }

    if (!hasGradeSystem && (horizon === "yearly" || horizon === "monthly") && targetValue) {
      payload.targetValue = parseFloat(targetValue);
    }

    onSave(payload);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Goal" : "Create Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Horizon selector — full width */}
          <div className="space-y-2">
            <Label>Goal Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "yearly", label: "Yearly Goal" },
                { value: "monthly", label: "Monthly Goal" },
                { value: "standalone", label: "Standalone" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleHorizonChange(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    horizon === opt.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ── LEFT COLUMN: Core Details ── */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-title">What do you want to achieve?</Label>
                <Input
                  id="goal-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    horizon === "yearly"
                      ? "e.g., Read 12 books, Run 500km"
                      : horizon === "monthly"
                        ? "e.g., Read 2 books in March"
                        : "e.g., Get promoted, Learn guitar"
                  }
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        selectedRoleIds.has(role.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => toggleRole(role.id)}
                    >
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                        selectedRoleIds.has(role.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}>
                        {selectedRoleIds.has(role.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="text-sm truncate">{role.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Yearly target fields */}
              {horizon === "yearly" && (
                <>
                  {hasGradeSystem ? (
                    <div className="space-y-2">
                      <Label>Target Grade</Label>
                      <Select value={targetUnit || GRADE_ORDER[0]} onValueChange={(v) => { setTargetUnit(v); setTargetMetric("grade"); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_ORDER.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        The grade you want to reach by the end of the year.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Target Value</Label>
                        <Input
                          type="number"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          placeholder="e.g., 12, 500"
                          min={0}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input
                          value={targetUnit}
                          onChange={(e) => setTargetUnit(e.target.value)}
                          placeholder="e.g., books, km, €"
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Target Date</Label>
                      <Input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Year derived from this date.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Sessions per week</Label>
                      <Input
                        type="number"
                        value={sessionsPerWeek}
                        onChange={(e) => setSessionsPerWeek(e.target.value)}
                        min={1}
                        max={7}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Monthly target fields */}
              {horizon === "monthly" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Sessions per week</Label>
                      <Input
                        type="number"
                        value={sessionsPerWeek}
                        onChange={(e) => setSessionsPerWeek(e.target.value)}
                        min={1}
                        max={7}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Target Value</Label>
                      <Input
                        type="number"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        placeholder="e.g., 2, 50"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Input
                        value={targetUnit}
                        onChange={(e) => setTargetUnit(e.target.value)}
                        placeholder="e.g., books, km"
                      />
                    </div>
                  </div>
                  {yearlyGoals.length > 0 && (
                    <div className="space-y-2">
                      <Label>Link to Yearly Goal (optional)</Label>
                      <Select
                        value={parentGoalId || "none"}
                        onValueChange={(v) => setParentGoalId(v === "none" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (standalone monthly)</SelectItem>
                          {yearlyGoals.map((yg) => (
                            <SelectItem key={yg.id} value={yg.id.toString()}>
                              {yg.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* Standalone target fields */}
              {horizon === "standalone" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="goal-target">Target Date (optional)</Label>
                    <Input
                      id="goal-target"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Urgency auto-calculated from this.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-sessions">Sessions per week</Label>
                    <Input
                      id="goal-sessions"
                      type="number"
                      value={sessionsPerWeek}
                      onChange={(e) => setSessionsPerWeek(e.target.value)}
                      min={1}
                      max={7}
                    />
                    <p className="text-xs text-muted-foreground">How many times per week.</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Activity Type (optional)</Label>
                <Select value={activityTypeId || "none"} onValueChange={(v) => setActivityTypeId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {activityTypes.map((at) => (
                      <SelectItem key={at.id} value={at.id.toString()}>
                        <span className="flex items-center gap-2"><LucideIcon name={at.icon} size="sm" />{at.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedActivityType && (
                <>
                  <div className="space-y-2">
                    <Label>Target Metric</Label>
                    <Select value={targetMetric} onValueChange={setTargetMetric}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targetMetricOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {targetMetric !== "sessions" && horizon === "standalone" && (
                    <>
                      <div className="space-y-2">
                        <Label>Target Value</Label>
                        <Input
                          type="number"
                          value={targetValue}
                          onChange={(e) => setTargetValue(e.target.value)}
                          placeholder={targetMetric === "duration" ? "e.g., 180 (minutes)" : "e.g., 10"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Target Period</Label>
                        <Select value={targetPeriod} onValueChange={(v) => setTargetPeriod(v as TargetPeriod)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="goal-desc">Description (optional)</Label>
                <Textarea
                  id="goal-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why is this goal important? What does success look like?"
                  rows={3}
                />
              </div>
            </div>

            {/* ── RIGHT COLUMN: Scheduling & Patterns ── */}
            <div className="space-y-4">
              {/* Scheduling Preferences */}
              <div className="space-y-3 rounded-lg border p-3">
                <Label className="text-sm font-medium">Scheduling Preferences</Label>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preferred Days</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {([
                      { value: 1, label: "Mon" },
                      { value: 2, label: "Tue" },
                      { value: 3, label: "Wed" },
                      { value: 4, label: "Thu" },
                      { value: 5, label: "Fri" },
                      { value: 6, label: "Sat" },
                      { value: 7, label: "Sun" },
                    ] as const).map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          setPreferredDays((prev) => {
                            const next = new Set(prev);
                            if (next.has(day.value)) {
                              next.delete(day.value);
                            } else {
                              next.add(day.value);
                            }
                            return next;
                          });
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          preferredDays.has(day.value)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no preference.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preferred Time</Label>
                  <Select
                    value={preferredTimeSlot || "none"}
                    onValueChange={(v) => setPreferredTimeSlot(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No preference</SelectItem>
                      <SelectItem value="morning">Morning (6–12)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12–17)</SelectItem>
                      <SelectItem value="evening">Evening (17–22)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Session Pattern */}
              <div className="rounded-lg border p-3 space-y-3">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full text-left"
                  onClick={() => setShowPatterns(!showPatterns)}
                >
                  {showPatterns
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                  <Label className="text-sm font-medium cursor-pointer">
                    Session Pattern
                  </Label>
                  {sessionPatterns.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({sessionPatterns.length} step{sessionPatterns.length !== 1 ? "s" : ""})
                    </span>
                  )}
                </button>
                {!showPatterns && (
                  <p className="text-xs text-muted-foreground pl-6">
                    Define a repeating cycle with different rest requirements.
                  </p>
                )}
                {showPatterns && (
                  <div className="space-y-2 pl-6">
                    {sessionPatterns.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                        <Input
                          value={p.label}
                          onChange={(e) => {
                            const next = [...sessionPatterns];
                            next[idx] = { ...next[idx], label: e.target.value };
                            setSessionPatterns(next);
                          }}
                          placeholder="e.g., Short run 4km"
                          className="flex-1"
                        />
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={p.restDaysAfter}
                            onChange={(e) => {
                              const next = [...sessionPatterns];
                              next[idx] = { ...next[idx], restDaysAfter: parseInt(e.target.value) || 1 };
                              setSessionPatterns(next);
                            }}
                            min={0}
                            max={7}
                            className="w-14 text-center"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">rest</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSessionPatterns(sessionPatterns.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSessionPatterns([...sessionPatterns, { label: "", restDaysAfter: 1 }])}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                    </Button>
                  </div>
                )}
              </div>

              {/* Auto-generate benchmarks (yearly only) */}
              {horizon === "yearly" && !isEditing && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border cursor-pointer ${
                        autoGenerate
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                      onClick={() => setAutoGenerate(!autoGenerate)}
                    >
                      {autoGenerate && <Check className="h-3 w-3" />}
                    </div>
                    <Label
                      className="cursor-pointer text-sm"
                      onClick={() => setAutoGenerate(!autoGenerate)}
                    >
                      Auto-generate monthly benchmarks
                    </Label>
                  </div>
                  {autoGenerate && (
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      <button
                        type="button"
                        onClick={() => setAutoGenerateMode("whole_year")}
                        className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                          autoGenerateMode === "whole_year"
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        Whole year
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoGenerateMode("from_now")}
                        className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                          autoGenerateMode === "from_now"
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        From now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Training Plan (yearly or standalone with activity type) */}
              {(horizon === "yearly" || horizon === "standalone") && !isEditing && activityTypeId && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border cursor-pointer ${
                        createTrainingPlan
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                      onClick={() => setCreateTrainingPlan(!createTrainingPlan)}
                    >
                      {createTrainingPlan && <Check className="h-3 w-3" />}
                    </div>
                    <Label
                      className="cursor-pointer text-sm"
                      onClick={() => setCreateTrainingPlan(!createTrainingPlan)}
                    >
                      Create Training Plan
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 pl-6">
                    Opens training plan setup after saving the goal.
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
