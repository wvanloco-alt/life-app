"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Pencil, Trash2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityTypeForm } from "./sport-form";
import type { ActivityType } from "@/types";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import { DEFAULT_ACTIVITY_TYPES } from "@/lib/defaults";

export function SportsPage() {
  const [activityTypesList, setActivityTypesList] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivityType, setEditingActivityType] = useState<ActivityType | null>(null);

  const fetchActivityTypes = useCallback(async () => {
    const res = await fetch("/api/activity-types");
    const data = await res.json();
    setActivityTypesList(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActivityTypes();
  }, [fetchActivityTypes]);

  async function handleSave(data: Partial<ActivityType>) {
    if (editingActivityType) {
      await fetch(`/api/activity-types/${editingActivityType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/activity-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setFormOpen(false);
    setEditingActivityType(null);
    await fetchActivityTypes();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/activity-types/${id}`, { method: "DELETE" });
    await fetchActivityTypes();
  }

  async function seedDefaults() {
    for (const at of DEFAULT_ACTIVITY_TYPES) {
      await fetch("/api/activity-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(at),
      });
    }
    await fetchActivityTypes();
  }

  if (loading) {
    return (
      <div className="px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Activity Types</h1>
          <p className="text-muted-foreground">
            Define the activities you do and their tracking metrics.
          </p>
        </div>
        <Button onClick={() => { setEditingActivityType(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Activity Type
        </Button>
      </div>

      {activityTypesList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              No activity types defined yet. Add your activities to start tracking.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Activity Type
              </Button>
              <Button onClick={seedDefaults}>
                <Sparkles className="mr-2 h-4 w-4" />
                Start with Defaults
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Defaults: Running, Hiking, Tennis, Climbing (Gym), Climbing (Outdoor), Reading, Meditation, Journaling, Social Event
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activityTypesList.map((at) => (
            <Card key={at.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <EmojiIcon emoji={at.icon} size="lg" />
                  <div>
                    <CardTitle className="text-base">{at.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {at.type}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingActivityType(at);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(at.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {at.isTracked && (
                    <Badge variant="outline" className="text-xs">
                      Tracked
                    </Badge>
                  )}
                  {at.gradeSystem && (
                    <Badge variant="outline" className="text-xs">
                      {at.gradeSystem} grades
                    </Badge>
                  )}
                  {at.variants && at.variants.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {at.variants.length} variants
                    </Badge>
                  )}
                  {at.metricsConfig.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {at.metricsConfig.length} metrics
                    </Badge>
                  )}
                  {at.defaultCalories && (
                    <Badge variant="secondary" className="text-xs">
                      ~{at.defaultCalories} cal
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ActivityTypeForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingActivityType(null); }}
        onSave={handleSave}
        activityType={editingActivityType}
      />
    </div>
  );
}
