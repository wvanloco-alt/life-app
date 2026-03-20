"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Pause, Play } from "lucide-react";
import { generateTimeSlots } from "@/lib/dates";
import type { RecurringActivity, Role } from "@/types";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface RecurringManagerProps {
  open: boolean;
  onClose: () => void;
  recurring: RecurringActivity[];
  roles: Role[];
  onRefresh: () => void;
}

export function RecurringManager({
  open,
  onClose,
  recurring,
  roles,
  onRefresh,
}: RecurringManagerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringActivity | null>(null);

  const [title, setTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [roleId, setRoleId] = useState<string>("none");
  const [error, setError] = useState("");

  const timeSlots = generateTimeSlots();

  function openAdd() {
    setEditing(null);
    setTitle("");
    setSelectedDays(new Set());
    setStartTime("09:00");
    setEndTime("10:00");
    setRoleId("none");
    setError("");
    setFormOpen(true);
  }

  function openEdit(rec: RecurringActivity) {
    setEditing(rec);
    setTitle(rec.title);
    setSelectedDays(new Set([rec.dayOfWeek]));
    setStartTime(rec.startTime);
    setEndTime(rec.endTime);
    setRoleId(rec.roleId?.toString() ?? "none");
    setError("");
    setFormOpen(true);
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (selectedDays.size === 0) {
      setError("Select at least one day");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time");
      return;
    }

    const rid = roleId !== "none" ? parseInt(roleId) : null;

    if (editing) {
      await fetch(`/api/recurring-activities/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dayOfWeek: [...selectedDays][0],
          startTime,
          endTime,
          roleId: rid,
        }),
      });
    } else {
      for (const day of selectedDays) {
        await fetch("/api/recurring-activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            dayOfWeek: day,
            startTime,
            endTime,
            roleId: rid,
            quadrant: "Q2",
          }),
        });
      }
    }

    setFormOpen(false);
    onRefresh();
  }

  async function handleTogglePause(rec: RecurringActivity) {
    await fetch(`/api/recurring-activities/${rec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaused: !rec.isPaused }),
    });
    onRefresh();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/recurring-activities/${id}`, { method: "DELETE" });
    onRefresh();
  }

  const grouped = DAY_NAMES.slice(1).map((name, i) => ({
    day: i + 1,
    name,
    items: recurring.filter((r) => r.dayOfWeek === i + 1),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="sm:max-w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Recurring Events</SheetTitle>
            <SheetDescription>
              Events that repeat every week. The scheduler works around these.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <Button onClick={openAdd} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Recurring Event
            </Button>

            {recurring.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recurring events yet. Add things like gym sessions,
                standups, or weekly reviews.
              </p>
            )}

            {grouped.map(({ day, name, items }) => (
              <div key={day}>
                <h4 className="text-sm font-semibold mb-2">{name}</h4>
                <div className="space-y-2">
                  {items
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((rec) => (
                      <div
                        key={rec.id}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
                          rec.isPaused ? "opacity-50" : ""
                        }`}
                      >
                        {rec.roleColor && (
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: rec.roleColor }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{rec.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {rec.startTime}–{rec.endTime}
                            {rec.roleName && ` · ${rec.roleName}`}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleTogglePause(rec)}
                            title={rec.isPaused ? "Resume" : "Pause"}
                          >
                            {rec.isPaused ? (
                              <Play className="h-3.5 w-3.5" />
                            ) : (
                              <Pause className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(rec)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500"
                            onClick={() => handleDelete(rec.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Recurring Event" : "Add Recurring Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Gym, Team standup, Weekly review"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>{editing ? "Day" : "Days (select multiple)"}</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div
                    key={day}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 cursor-pointer text-sm transition-colors ${
                      selectedDays.has(day)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => toggleDay(day)}
                  >
                    <Checkbox
                      checked={selectedDays.has(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    {DAY_SHORT[day]}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
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
                    {timeSlots.filter((t) => t > startTime).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role (optional)</Label>
              <Select value={roleId} onValueChange={setRoleId}>
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

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
