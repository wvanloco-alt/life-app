"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { RoleBadge } from "@/components/roles/role-badge";
import { getQuadrantInfo } from "@/lib/quadrants";
import type { Goal } from "@/types";

interface GoalCardProps {
  goal: Goal;
  onToggle: (id: number, isCompleted: boolean) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: number) => void;
}

export function GoalCard({ goal, onToggle, onEdit, onDelete }: GoalCardProps) {
  const quadrant = getQuadrantInfo(goal.quadrant);

  return (
    <Card
      className={`transition-opacity ${goal.isCompleted ? "opacity-60" : ""}`}
    >
      <CardHeader className="flex flex-row items-start gap-3 py-3 pb-1">
        <Checkbox
          checked={goal.isCompleted}
          onCheckedChange={(checked) =>
            onToggle(goal.id, checked as boolean)
          }
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <CardTitle
            className={`text-sm font-medium ${
              goal.isCompleted ? "line-through text-muted-foreground" : ""
            }`}
          >
            {goal.title}
          </CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(goal)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(goal.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pb-3 pt-0 pl-10">
        <div className="flex items-center gap-2 flex-wrap">
          {goal.roles.map((r) => (
            <RoleBadge key={r.id} name={r.name} color={r.color} />
          ))}
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${quadrant.hexColor}20`,
              color: quadrant.hexColor,
            }}
          >
            {quadrant.shortLabel}
          </span>
        </div>
        {goal.description && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {goal.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
