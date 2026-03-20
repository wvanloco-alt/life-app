"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Plus } from "lucide-react";
import { RoleBadge } from "@/components/roles/role-badge";
import { format } from "date-fns";
import type { Goal, GoalProgress } from "@/types";

interface MonthlyGoalCardProps {
  goal: Goal;
  progress: GoalProgress | null;
  onEdit: () => void;
  onDelete: () => void;
  onLogTally: () => void;
}

export function MonthlyGoalCard({
  goal,
  progress,
  onEdit,
  onDelete,
  onLogTally,
}: MonthlyGoalCardProps) {
  const current = progress?.current ?? 0;
  const target = goal.targetValue ?? 0;
  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const monthLabel = goal.month
    ? format(new Date(`${goal.month}-01`), "MMMM yyyy")
    : "";
  const met = percentage >= 100;
  const unitLabel = goal.targetUnit ?? "";

  return (
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-[family-name:var(--font-display)] text-sm font-medium truncate">{goal.title}</h4>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 shrink-0 ${
                  met
                    ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                    : ""
                }`}
              >
                {met ? "Achieved" : `${percentage}%`}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {monthLabel} · {current} / {target} {unitLabel}
            </p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${
                  met ? "bg-emerald-500" : "bg-primary"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {goal.roles.map((r) => (
                <RoleBadge key={r.id} name={r.name} color={r.color} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onLogTally}
            >
              <Plus className="mr-1 h-3 w-3" /> Log
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
