"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Pencil,
  Archive,
  Trash2,
  ArchiveRestore,
  Calendar,
  Target,
  Users,
  List,
  LayoutDashboard,
  AlertTriangle,
  Mountain,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { RoleBadge } from "@/components/roles/role-badge";
import { TrainingPlanSection } from "./training-plan-section";
import { getQuadrantInfo } from "@/lib/quadrants";
import { GoalFormStandalone, type GoalFormPayload } from "./goal-form-standalone";
import { YearlyGoalCard } from "./yearly-goal-card";
import { MonthlyGoalCard } from "./monthly-goal-card";
import { TallyLogger } from "./tally-logger";
import { TrainingPlanDialog } from "./training-plan-dialog";
import { TennisTrainingPlanDialog } from "./tennis-training-plan-dialog";
import { RunningTrainingPlanDialog } from "./running-training-plan-dialog";
import { format, isPast, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type { Goal, Role, GoalStatus, GoalProgress, TrainingPlan, TrainingSport } from "@/types";
import { EmojiIcon } from "@/components/ui/emoji-icon";

type ChildGoal = Goal & { progress: { current: number; target: number; percentage: number } };

function detectSport(goal: Goal): TrainingSport | null {
  const name = (goal.activityTypeName ?? "").toLowerCase();
  if (name.includes("climbing")) return "climbing";
  if (name.includes("tennis")) return "tennis";
  if (name.includes("running")) return "running";
  return null;
}

export function GoalsPage() {
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, GoalProgress>>({});
  const [childrenMap, setChildrenMap] = useState<Record<number, ChildGoal[]>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [viewMode, setViewMode] = useState<"dashboard" | "list">("dashboard");
  const [listFilter, setListFilter] = useState<GoalStatus | "all">("active");
  const [tallyGoal, setTallyGoal] = useState<Goal | null>(null);
  const [trainingPlansMap, setTrainingPlansMap] = useState<Record<number, TrainingPlan>>({});
  const [trainingPlanGoal, setTrainingPlanGoal] = useState<Goal | null>(null);

  const currentMonth = format(new Date(), "yyyy-MM");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [goalsRes, rolesRes] = await Promise.all([
      fetch("/api/goals?status=all"),
      fetch("/api/roles"),
    ]);
    const [goalsData, rolesData] = await Promise.all([
      goalsRes.json(),
      rolesRes.json(),
    ]);
    setAllGoals(goalsData);
    setRoles(rolesData);

    const activeGoals = (goalsData as Goal[]).filter((g) => g.status === "active");
    const yearlyGoals = activeGoals.filter((g) => g.horizon === "yearly");

    const [progressResults, childrenResults] = await Promise.all([
      Promise.all(
        activeGoals.map((g) =>
          fetch(`/api/goals/${g.id}/progress`)
            .then((r) => r.json())
            .catch(() => null)
        )
      ),
      Promise.all(
        yearlyGoals.map((g) =>
          fetch(`/api/goals/${g.id}/children`)
            .then((r) => r.json())
            .catch(() => [])
        )
      ),
    ]);

    const pMap: Record<number, GoalProgress> = {};
    activeGoals.forEach((g, i) => {
      if (progressResults[i] && !("error" in progressResults[i])) {
        pMap[g.id] = progressResults[i];
      }
    });
    setProgressMap(pMap);

    const cMap: Record<number, ChildGoal[]> = {};
    yearlyGoals.forEach((g, i) => {
      cMap[g.id] = childrenResults[i] ?? [];
    });
    setChildrenMap(cMap);

    const goalsWithPossiblePlans = activeGoals.filter(
      (g) => g.horizon === "yearly" || !g.horizon
    );
    const tpResults = await Promise.all(
      goalsWithPossiblePlans.map((g) =>
        fetch(`/api/training-plans?goalId=${g.id}`)
          .then((r) => r.json())
          .catch(() => null)
      )
    );
    const tpMap: Record<number, TrainingPlan> = {};
    goalsWithPossiblePlans.forEach((g, i) => {
      if (tpResults[i] && tpResults[i].id) {
        tpMap[g.id] = tpResults[i];
      }
    });
    setTrainingPlansMap(tpMap);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeGoals = allGoals.filter((g) => g.status === "active");
  const yearlyGoals = activeGoals.filter((g) => g.horizon === "yearly");
  const standaloneGoals = activeGoals.filter((g) => !g.horizon);
  const thisMonthGoals = activeGoals.filter(
    (g) => g.horizon === "monthly" && g.month === currentMonth
  );
  const incompletePastMonthly = activeGoals.filter(
    (g) =>
      g.horizon === "monthly" &&
      g.month &&
      g.month < currentMonth &&
      (progressMap[g.id]?.percentage ?? 0) < 100
  );

  const onTrackCount = yearlyGoals.filter((g) => {
    const p = progressMap[g.id];
    return p?.paceStatus === "ahead" || p?.paceStatus === "on_track";
  }).length;

  async function handleSave(data: GoalFormPayload) {
    const { autoGenerate, sessionPatterns, createTrainingPlan, ...body } = data;
    if (editingGoal) {
      await fetch(`/api/goals/${editingGoal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (sessionPatterns !== undefined) {
        await fetch(`/api/goals/${editingGoal.id}/session-patterns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patterns: sessionPatterns }),
        });
      }
    } else {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await res.json();

      if (autoGenerate?.enabled && body.horizon === "yearly" && created.id) {
        const targetYear = body.targetDate
          ? new Date(body.targetDate).getFullYear()
          : new Date().getFullYear();
        const now = new Date();
        const currentMonthIdx = now.getMonth();
        const yearlyTarget = body.targetValue ?? 0;

        const startMonth = autoGenerate.mode === "whole_year" ? 0 : currentMonthIdx;
        const monthCount = 12 - startMonth;
        const monthlyTarget = monthCount > 0 ? yearlyTarget / monthCount : yearlyTarget;

        for (let m = startMonth; m < 12; m++) {
          const monthStr = `${targetYear}-${String(m + 1).padStart(2, "0")}`;
          await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `${body.title} — ${format(new Date(targetYear, m, 1), "MMMM")}`,
              description: null,
              roleIds: body.roleIds,
              targetDate: null,
              sessionsPerWeek: body.sessionsPerWeek,
              activityTypeId: body.activityTypeId ?? null,
              targetMetric: body.targetMetric ?? null,
              targetValue: Math.round(monthlyTarget * 100) / 100,
              targetPeriod: null,
              targetUnit: body.targetUnit ?? null,
              horizon: "monthly",
              parentGoalId: created.id,
              month: monthStr,
            }),
          });
        }
      }

      if (sessionPatterns && sessionPatterns.length > 0 && created.id) {
        await fetch(`/api/goals/${created.id}/session-patterns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patterns: sessionPatterns }),
        });
      }

      if (createTrainingPlan && created.id) {
        setFormOpen(false);
        setEditingGoal(null);
        await fetchData();
        const newGoal: Goal = {
          ...created,
          roles: [],
          quadrant: "Q2",
        };
        setTrainingPlanGoal(newGoal);
        return;
      }
    }
    setFormOpen(false);
    setEditingGoal(null);
    await fetchData();
  }

  async function handleArchive(goal: Goal) {
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: goal.status === "archived" ? "active" : "archived" }),
    });
    await fetchData();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    await fetchData();
  }

  async function handleToggleComplete(goal: Goal) {
    const newCompleted = !goal.isCompleted;
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isCompleted: newCompleted,
        status: newCompleted ? "completed" : "active",
      }),
    });
    await fetchData();
  }

  function renderTargetBadge(goal: Goal) {
    if (!goal.targetDate) return null;
    const target = new Date(goal.targetDate + "T00:00:00");
    const daysLeft = differenceInDays(target, new Date());
    const overdue = isPast(target) && !goal.isCompleted;
    return (
      <Badge variant="outline" className={`text-xs ${overdue ? "border-red-500 text-red-500" : ""}`}>
        <Calendar className="mr-1 h-3 w-3" />
        {format(target, "MMM d, yyyy")}
        {!goal.isCompleted && (
          <span className="ml-1">
            {overdue ? `(${Math.abs(daysLeft)}d overdue)` : `(${daysLeft}d left)`}
          </span>
        )}
      </Badge>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const filteredListGoals = listFilter === "all"
    ? allGoals
    : allGoals.filter((g) => g.status === listFilter);

  return (
    <div className="px-6 py-8 space-y-8 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {yearlyGoals.length > 0
              ? `${onTrackCount} of ${yearlyGoals.length} yearly goals on track`
              : "Set yearly objectives, break them into monthly benchmarks, and track your pace."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border p-0.5">
            <Button
              variant={viewMode === "dashboard" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("dashboard")}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            onClick={() => { setEditingGoal(null); setFormOpen(true); }}
            disabled={roles.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" /> New Goal
          </Button>
        </div>
      </div>

      {roles.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title="Define your roles first"
              description="Life roles are the foundation of goal-setting. Set up your roles, then come back to create goals."
              action={{ label: "Go to Roles", href: "/settings/roles" }}
            />
          </CardContent>
        </Card>
      )}

      {viewMode === "dashboard" && roles.length > 0 && (
        <>
          {/* Yearly Goals */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Yearly Goals
            </h2>
            {yearlyGoals.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Target}
                    title="No yearly goals yet"
                    description="Think big. What do you want to achieve this year?"
                    action={{
                      label: "Create Yearly Goal",
                      onClick: () => { setEditingGoal(null); setFormOpen(true); },
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {yearlyGoals.map((g) => (
                  <YearlyGoalCard
                    key={g.id}
                    goal={g}
                    progress={progressMap[g.id] ?? null}
                    children={childrenMap[g.id] ?? []}
                    currentMonth={currentMonth}
                    trainingPlan={trainingPlansMap[g.id] ?? null}
                    onEdit={() => { setEditingGoal(g); setFormOpen(true); }}
                    onArchive={() => handleArchive(g)}
                    onDelete={() => handleDelete(g.id)}
                    onLogTally={() => setTallyGoal(g)}
                    onCreateTrainingPlan={detectSport(g) ? () => setTrainingPlanGoal(g) : undefined}
                    onTrainingPlanChanged={() => fetchData()}
                  />
                ))}
              </div>
            )}
          </section>

          {/* This Month */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              This Month — {format(new Date(), "MMMM yyyy")}
            </h2>
            {thisMonthGoals.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    No monthly goals for {format(new Date(), "MMMM")}. Create a yearly goal with
                    auto-generated benchmarks, or add a standalone monthly goal.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {thisMonthGoals.map((g) => (
                  <MonthlyGoalCard
                    key={g.id}
                    goal={g}
                    progress={progressMap[g.id] ?? null}
                    onEdit={() => { setEditingGoal(g); setFormOpen(true); }}
                    onDelete={() => handleDelete(g.id)}
                    onLogTally={() => setTallyGoal(g)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Incomplete Past Months */}
          {incompletePastMonthly.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Incomplete
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incompletePastMonthly.map((g) => (
                  <MonthlyGoalCard
                    key={g.id}
                    goal={g}
                    progress={progressMap[g.id] ?? null}
                    onEdit={() => { setEditingGoal(g); setFormOpen(true); }}
                    onDelete={() => handleDelete(g.id)}
                    onLogTally={() => setTallyGoal(g)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Standalone Goals */}
          {standaloneGoals.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Standalone Goals
              </h2>
              <div className="space-y-2">
                {standaloneGoals.map((goal) => {
                  const quadrant = getQuadrantInfo(goal.quadrant);
                  const progress = progressMap[goal.id];
                  return (
                    <Card
                      key={goal.id}
                      className={`transition-opacity ${goal.isCompleted ? "opacity-60" : ""}`}
                    >
                      <CardContent className="flex items-start gap-3 py-3 px-4">
                        <Checkbox
                          checked={goal.isCompleted}
                          onCheckedChange={() => handleToggleComplete(goal)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${goal.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            {goal.title}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {goal.activityTypeIcon && goal.activityTypeName && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <EmojiIcon emoji={goal.activityTypeIcon} size="sm" />
                                {goal.activityTypeName}
                              </Badge>
                            )}
                            {goal.roles.map((r) => (
                              <RoleBadge key={r.id} name={r.name} color={r.color} />
                            ))}
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${quadrant.hexColor}20`, color: quadrant.hexColor }}
                            >
                              {quadrant.shortLabel}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {goal.sessionsPerWeek}x/wk
                            </Badge>
                            {renderTargetBadge(goal)}
                          </div>
                          {progress && (
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{progress.metricLabel} ({progress.period})</span>
                                <span>{progress.current} / {progress.target}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingGoal(goal); setFormOpen(true); }}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {detectSport(goal) && !trainingPlansMap[goal.id] && (
                              <DropdownMenuItem onClick={() => setTrainingPlanGoal(goal)}>
                                <Mountain className="mr-2 h-4 w-4" /> Create Training Plan
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleArchive(goal)}>
                              {goal.status === "archived" ? (
                                <><ArchiveRestore className="mr-2 h-4 w-4" /> Restore</>
                              ) : (
                                <><Archive className="mr-2 h-4 w-4" /> Archive</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(goal.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardContent>
                      {trainingPlansMap[goal.id] && (
                        <div className="px-4 pb-3">
                          <TrainingPlanSection
                            plan={trainingPlansMap[goal.id]}
                            onRefresh={() => fetchData()}
                          />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* List View */}
      {viewMode === "list" && roles.length > 0 && (
        <>
          <div className="flex gap-2">
            {(["active", "completed", "archived", "all"] as const).map((s) => (
              <Button
                key={s}
                variant={listFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setListFilter(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          {filteredListGoals.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Target}
                  title={`No ${listFilter === "all" ? "" : listFilter + " "}goals`}
                  description={listFilter === "active" ? "Create your first goal to get started." : undefined}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredListGoals.map((goal) => {
                const quadrant = getQuadrantInfo(goal.quadrant);
                const progress = progressMap[goal.id];
                const horizonLabel = goal.horizon
                  ? goal.horizon === "yearly"
                    ? "Yearly"
                    : `Monthly (${goal.month})`
                  : null;
                return (
                  <Card
                    key={goal.id}
                    className={`transition-opacity ${goal.isCompleted || goal.status === "archived" ? "opacity-60" : ""}`}
                  >
                    <CardContent className="flex items-start gap-3 py-3 px-4">
                      <Checkbox
                        checked={goal.isCompleted}
                        onCheckedChange={() => handleToggleComplete(goal)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${goal.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {goal.title}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {horizonLabel && (
                            <Badge variant="secondary" className="text-xs">{horizonLabel}</Badge>
                          )}
                          {goal.activityTypeIcon && goal.activityTypeName && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <EmojiIcon emoji={goal.activityTypeIcon} size="sm" />
                              {goal.activityTypeName}
                            </Badge>
                          )}
                          {goal.roles.map((r) => (
                            <RoleBadge key={r.id} name={r.name} color={r.color} />
                          ))}
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${quadrant.hexColor}20`, color: quadrant.hexColor }}
                          >
                            {quadrant.shortLabel}
                          </span>
                          <Badge variant="outline" className="text-xs">{goal.sessionsPerWeek}x/wk</Badge>
                          {renderTargetBadge(goal)}
                        </div>
                        {progress && (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{progress.metricLabel} ({progress.period})</span>
                              <span>{progress.current} / {progress.target}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingGoal(goal); setFormOpen(true); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(goal)}>
                            {goal.status === "archived" ? (
                              <><ArchiveRestore className="mr-2 h-4 w-4" /> Restore</>
                            ) : (
                              <><Archive className="mr-2 h-4 w-4" /> Archive</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(goal.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <GoalFormStandalone
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingGoal(null); }}
        onSave={handleSave}
        roles={roles}
        goal={editingGoal}
        yearlyGoals={allGoals.filter((g) => g.horizon === "yearly" && g.status === "active")}
      />

      {tallyGoal && (
        <TallyLogger
          open={!!tallyGoal}
          onClose={() => setTallyGoal(null)}
          goalId={tallyGoal.id}
          goalTitle={tallyGoal.title}
          targetUnit={tallyGoal.targetUnit}
          onLogged={() => fetchData()}
        />
      )}

      {trainingPlanGoal && !detectSport(trainingPlanGoal) && (
        <Dialog open onOpenChange={() => setTrainingPlanGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Training Plan Not Available</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Training plans are currently supported for Climbing, Tennis, and Running activity types.
              The activity type on this goal (&quot;{trainingPlanGoal.activityTypeName}&quot;) is not recognized.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setTrainingPlanGoal(null)}>OK</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {trainingPlanGoal && detectSport(trainingPlanGoal) === "tennis" && (
        <TennisTrainingPlanDialog
          open={!!trainingPlanGoal}
          onClose={() => setTrainingPlanGoal(null)}
          goalId={trainingPlanGoal.id}
          goalTitle={trainingPlanGoal.title}
          onCreated={() => fetchData()}
        />
      )}
      {trainingPlanGoal && detectSport(trainingPlanGoal) === "running" && (
        <RunningTrainingPlanDialog
          open={!!trainingPlanGoal}
          onClose={() => setTrainingPlanGoal(null)}
          goalId={trainingPlanGoal.id}
          goalTitle={trainingPlanGoal.title}
          onCreated={() => fetchData()}
        />
      )}
      {trainingPlanGoal && detectSport(trainingPlanGoal) === "climbing" && (
        <TrainingPlanDialog
          open={!!trainingPlanGoal}
          onClose={() => setTrainingPlanGoal(null)}
          goalId={trainingPlanGoal.id}
          goalTitle={trainingPlanGoal.title}
          onCreated={() => fetchData()}
        />
      )}
    </div>
  );
}
