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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateTimeSlots } from "@/lib/dates";
import type { Activity, Role, Goal, Quadrant, ActivityType } from "@/types";
import { LucideIcon } from "@/components/ui/lucide-icon";

interface ActivityFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    activityDate: string;
    startTime: string;
    endTime: string;
    quadrant: Quadrant;
    roleId: number | null;
    goalId: number | null;
    activityTypeId: number | null;
    notes: string;
  }) => void;
  roles: Role[];
  goals: Goal[];
  activity?: Activity | null;
  defaultDate?: string;
  defaultStartTime?: string;
}

export function ActivityForm({
  open,
  onClose,
  onSave,
  roles,
  goals,
  activity,
  defaultDate,
  defaultStartTime,
}: ActivityFormProps) {
  const [title, setTitle] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roleId, setRoleId] = useState<string>("none");
  const [goalId, setGoalId] = useState<string>("none");
  const [activityTypeId, setActivityTypeId] = useState<string>("none");
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const timeSlots = generateTimeSlots();
  const isEditing = !!activity;

  useEffect(() => {
    if (open) {
      setTitle(activity?.title ?? "");
      setActivityDate(activity?.activityDate ?? defaultDate ?? "");
      setStartTime(activity?.startTime ?? defaultStartTime ?? "06:00");
      setEndTime(activity?.endTime ?? getDefaultEndTime(defaultStartTime ?? "06:00"));
      setRoleId(activity?.roleId?.toString() ?? "none");
      setGoalId(activity?.goalId?.toString() ?? "none");
      setActivityTypeId(activity?.activityTypeId?.toString() ?? "none");
      setNotes(activity?.notes ?? "");
      setError("");
    }
  }, [open, activity, defaultDate, defaultStartTime]);

  useEffect(() => {
    if (open) {
      fetch("/api/activity-types")
        .then((res) => res.json())
        .then((data: ActivityType[]) => setActivityTypes(data))
        .catch(() => setActivityTypes([]));
    }
  }, [open]);

  function getDefaultEndTime(start: string): string {
    const [h, m] = start.split(":").map(Number);
    const endH = h + (m >= 30 ? 1 : 0);
    const endM = m >= 30 ? 0 : 30;
    return `${String(Math.min(endH, 23)).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!activityDate) {
      setError("Date is required");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time");
      return;
    }
    setError("");
    onSave({
      title: title.trim(),
      activityDate,
      startTime,
      endTime,
      quadrant: activity?.quadrant ?? "Q2",
      roleId: roleId !== "none" ? parseInt(roleId) : null,
      goalId: goalId !== "none" ? parseInt(goalId) : null,
      activityTypeId: activityTypeId !== "none" ? parseInt(activityTypeId) : null,
      notes: notes.trim(),
    });
  }

  const filteredGoals = roleId !== "none"
    ? goals.filter((g) => g.roles.some((r) => r.id === parseInt(roleId)))
    : goals;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Activity" : "Schedule Activity"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="act-title">Activity</Label>
            <Input
              id="act-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team standup, Gym session"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="act-date">Date</Label>
              <Input
                id="act-date"
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots
                    .filter((t) => t > startTime)
                    .map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role (optional)</Label>
            <Select value={roleId} onValueChange={(v) => { setRoleId(v); setGoalId("none"); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No role</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: r.color }}
                      />
                      {r.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activityTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Activity Type (optional)</Label>
              <Select value={activityTypeId} onValueChange={setActivityTypeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activityTypes.map((at) => (
                    <SelectItem key={at.id} value={at.id.toString()}>
                      <span className="flex items-center gap-2">
                        <LucideIcon name={at.icon} size="sm" />
                        {at.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Label htmlFor="act-notes">Notes (optional)</Label>
            <Textarea
              id="act-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra details..."
              rows={4}
              className="max-h-[240px] overflow-y-auto text-[13px] leading-relaxed"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Save" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
