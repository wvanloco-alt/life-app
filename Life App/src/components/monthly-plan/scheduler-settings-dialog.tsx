"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SchedulerSettings } from "@/types";

interface SchedulerSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const DAY_LABELS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function SchedulerSettingsDialog({
  open,
  onClose,
}: SchedulerSettingsDialogProps) {
  const [settings, setSettings] = useState<SchedulerSettings | null>(null);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/scheduler-settings")
      .then((r) => r.json())
      .then((data: SchedulerSettings) => {
        setSettings(data);
        setWorkStart(data.workStartTime);
        setWorkEnd(data.workEndTime);
        setWorkDays(data.workDays);
      });
  }, [open]);

  function toggleDay(day: number) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/scheduler-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workStartTime: workStart,
        workEndTime: workEnd,
        workDays,
      }),
    });
    setSaving(false);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-[family-name:var(--font-display)]">Scheduler Settings</SheetTitle>
          <SheetDescription>
            Configure work hours and work days. The scheduler places professional
            goals during work hours and personal goals outside of them.
          </SheetDescription>
        </SheetHeader>

        {settings ? (
          <div className="space-y-8 mt-8">
            <div>
              <h3 className="text-sm font-medium mb-3">Work Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="work-start" className="text-xs text-muted-foreground">Starts at</Label>
                  <Input
                    id="work-start"
                    type="time"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-end" className="text-xs text-muted-foreground">Ends at</Label>
                  <Input
                    id="work-end"
                    type="time"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Work Days</h3>
              <div className="grid grid-cols-4 gap-2">
                {DAY_LABELS.map((d) => {
                  const isActive = workDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Loading settings...
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
