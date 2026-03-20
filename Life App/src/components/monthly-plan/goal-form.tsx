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
import { Checkbox } from "@/components/ui/checkbox";
import type { Goal, Role } from "@/types";

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    roleIds: number[];
    targetDate: string;
    sessionsPerWeek: number;
  }) => void;
  roles: Role[];
  goal?: Goal | null;
}

export function GoalForm({ open, onClose, onSave, roles, goal }: GoalFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState("");

  const isEditing = !!goal;

  useEffect(() => {
    if (open) {
      setTitle(goal?.title ?? "");
      setDescription(goal?.description ?? "");
      setSelectedRoleIds(
        new Set(goal?.roles?.map((r) => r.id) ?? (roles[0] ? [roles[0].id] : []))
      );
      setTargetDate(goal?.targetDate ?? "");
      setError("");
    }
  }, [open, goal, roles]);

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
    setError("");
    onSave({
      title: title.trim(),
      description: description.trim(),
      roleIds: [...selectedRoleIds],
      targetDate,
      sessionsPerWeek: goal?.sessionsPerWeek ?? 3,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Goal" : "Add Goal"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-title">What do you want to achieve?</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete project proposal"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Roles (select all that apply)</Label>
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
                  <Checkbox
                    checked={selectedRoleIds.has(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="text-sm truncate">{role.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-target">Target Date (optional)</Label>
            <Input
              id="goal-target"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-desc">Notes (optional)</Label>
            <Textarea
              id="goal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this important?"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Save" : "Add Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
