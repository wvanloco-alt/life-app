"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, CalendarOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { SchedulerSettings, SchedulerBlackoutDate } from "@/types";

const DAY_LABELS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function SchedulerRulesPage() {
  const [settings, setSettings] = useState<SchedulerSettings | null>(null);
  const [blackoutDates, setBlackoutDates] = useState<SchedulerBlackoutDate[]>([]);
  const [saving, setSaving] = useState(false);
  const [newBlackout, setNewBlackout] = useState({ date: "", label: "", isRecurring: false });

  const fetchData = useCallback(async () => {
    const [settingsRes, blackoutsRes] = await Promise.all([
      fetch("/api/scheduler-settings"),
      fetch("/api/scheduler-blackout-dates"),
    ]);
    const settingsData = await settingsRes.json();
    const blackoutsData = await blackoutsRes.json();
    setSettings(settingsData);
    setBlackoutDates(blackoutsData);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSaveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/scheduler-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const updated = await res.json();
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBlackout() {
    if (!newBlackout.date) return;
    const res = await fetch("/api/scheduler-blackout-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBlackout),
    });
    if (res.ok) {
      setNewBlackout({ date: "", label: "", isRecurring: false });
      fetchData();
    }
  }

  async function handleDeleteBlackout(id: number) {
    await fetch(`/api/scheduler-blackout-dates/${id}`, { method: "DELETE" });
    setBlackoutDates((prev) => prev.filter((b) => b.id !== id));
  }

  function toggleWorkDay(day: number) {
    if (!settings) return;
    const workDays = settings.workDays.includes(day)
      ? settings.workDays.filter((d) => d !== day)
      : [...settings.workDays, day].sort((a, b) => a - b);
    setSettings({ ...settings, workDays });
  }

  if (!settings) {
    return (
      <div className="px-6 py-8 space-y-4">
        <div className="h-6 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="h-40 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-8 animate-fade-up">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Scheduler Rules</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Configure how the auto-scheduler distributes activities across your calendar.
        </p>
      </div>

      {/* Work Hours & Days */}
      <Card className="border-border/50">
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Work Hours</h3>
            <div className="flex items-center gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Input
                  type="time"
                  value={settings.workStartTime}
                  onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                  className="w-32"
                />
              </div>
              <span className="text-muted-foreground mt-5">to</span>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Input
                  type="time"
                  value={settings.workEndTime}
                  onChange={(e) => setSettings({ ...settings, workEndTime: e.target.value })}
                  className="w-32"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Work Days</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Work goals are scheduled during work hours on these days. Personal goals use morning and evening slots.
            </p>
            <div className="flex gap-2">
              {DAY_LABELS.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleWorkDay(day.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    settings.workDays.includes(day.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Rules */}
      <Card className="border-border/50">
        <CardContent className="pt-6 space-y-6">
          <h3 className="text-sm font-medium">Distribution Rules</h3>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Enforce weekly spread</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Caps each goal at its sessions-per-week within each actual week, preventing front-loading.
              </p>
            </div>
            <Switch
              checked={settings.enforceWeeklySpread}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enforceWeeklySpread: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Max activities per day</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Limits how many activities can be scheduled on any single day.
              </p>
            </div>
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.maxActivitiesPerDay}
              onChange={(e) =>
                setSettings({ ...settings, maxActivitiesPerDay: parseInt(e.target.value) || 4 })
              }
              className="w-20 text-center"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Blackout Dates */}
      <Card className="border-border/50">
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium">Blackout Dates</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Days where nothing should be scheduled (holidays, birthdays, etc.).
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={newBlackout.date}
                onChange={(e) => setNewBlackout({ ...newBlackout, date: e.target.value })}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs text-muted-foreground">Label (optional)</Label>
              <Input
                value={newBlackout.label}
                onChange={(e) => setNewBlackout({ ...newBlackout, label: e.target.value })}
                placeholder="e.g., Birthday"
              />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <Switch
                checked={newBlackout.isRecurring}
                onCheckedChange={(checked) =>
                  setNewBlackout({ ...newBlackout, isRecurring: checked })
                }
              />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Yearly</Label>
            </div>
            <Button onClick={handleAddBlackout} size="sm" disabled={!newBlackout.date}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {blackoutDates.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="No blackout dates"
              description="Add dates when nothing should be scheduled."
            />
          ) : (
            <div className="space-y-2">
              {blackoutDates.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{b.date}</span>
                    {b.label && (
                      <span className="text-sm text-muted-foreground">— {b.label}</span>
                    )}
                    {b.isRecurring && (
                      <span className="text-xs bg-muted/50 rounded px-2 py-0.5 text-muted-foreground">
                        Yearly
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBlackout(b.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
