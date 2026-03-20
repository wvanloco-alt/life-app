"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { GoalTally } from "@/types";

interface TallyLoggerProps {
  open: boolean;
  onClose: () => void;
  goalId: number;
  goalTitle: string;
  targetUnit: string | null;
  onLogged: () => void;
}

export function TallyLogger({
  open,
  onClose,
  goalId,
  goalTitle,
  targetUnit,
  onLogged,
}: TallyLoggerProps) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [count, setCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [tallies, setTallies] = useState<GoalTally[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchTallies = useCallback(async () => {
    const res = await fetch(`/api/goal-tallies?goalId=${goalId}`);
    const data = await res.json();
    setTallies(data.sort((a: GoalTally, b: GoalTally) => b.date.localeCompare(a.date)));
  }, [goalId]);

  useEffect(() => {
    if (open) {
      setDate(format(new Date(), "yyyy-MM-dd"));
      setCount("1");
      setNotes("");
      fetchTallies();
    }
  }, [open, fetchTallies]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/goal-tallies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goalId,
        date,
        count: parseInt(count) || 1,
        notes: notes.trim() || null,
      }),
    });
    setSaving(false);
    setCount("1");
    setNotes("");
    await fetchTallies();
    onLogged();
  }

  async function handleDelete(tallyId: number) {
    await fetch(`/api/goal-tallies/${tallyId}`, { method: "DELETE" });
    await fetchTallies();
    onLogged();
  }

  const unitLabel = targetUnit ?? "units";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Log Progress — {goalTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Count ({unitLabel})</Label>
              <Input
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                min={1}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`e.g., Finished "Atomic Habits"`}
              rows={2}
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Log Progress"}
          </Button>

          {tallies.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                History
              </p>
              {tallies.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{t.count} {unitLabel}</span>
                    <span className="text-muted-foreground ml-2">
                      {format(new Date(t.date), "MMM d")}
                    </span>
                    {t.notes && (
                      <span className="text-muted-foreground ml-2 truncate">
                        — {t.notes}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
