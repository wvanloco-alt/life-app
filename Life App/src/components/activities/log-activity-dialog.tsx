"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LucideIcon } from "@/components/ui/lucide-icon";
import type { ActivityType } from "@/types";

export interface LogActivityDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  activityTypes: ActivityType[];
  defaultDate: string;
  defaultActivityTypeId?: number;
  /** When provided, the corresponding activity is marked complete on save. */
  defaultActivityId?: number;
}

export function LogActivityDialog({
  open,
  onClose,
  onSave,
  activityTypes,
  defaultDate,
  defaultActivityTypeId,
  defaultActivityId,
}: LogActivityDialogProps) {
  const [activityTypeId, setActivityTypeId] = useState<string>(
    defaultActivityTypeId?.toString() ?? ""
  );
  const [durationMinutes, setDurationMinutes] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setActivityTypeId(defaultActivityTypeId?.toString() ?? "");
      setDurationMinutes("");
      setDate(defaultDate);
      setNotes("");
    }
  }, [open, defaultDate, defaultActivityTypeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mins = parseInt(durationMinutes, 10);
    if (!activityTypeId || !mins || mins <= 0) return;

    setSaving(true);
    try {
      await fetch("/api/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityTypeId: parseInt(activityTypeId),
          activityId: defaultActivityId ?? null,
          date,
          durationMinutes: mins,
          notes: notes.trim() || null,
        }),
      });
      if (defaultActivityId) {
        await fetch(`/api/activities/${defaultActivityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCompleted: true }),
        });
      }
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="log-activity-type">Activity Type</Label>
            <Select
              value={activityTypeId || "none"}
              onValueChange={(v) => setActivityTypeId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="log-activity-type">
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
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
          <div className="space-y-2">
            <Label htmlFor="log-duration">Duration (minutes)</Label>
            <Input
              id="log-duration"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="log-date">Date</Label>
            <Input
              id="log-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="log-notes">Notes (optional)</Label>
            <Textarea
              id="log-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !activityTypeId || !durationMinutes}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
