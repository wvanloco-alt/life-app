"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivitiesDashboard } from "./activities-dashboard";
import { WorkoutLog } from "./workout-log";
import { BodyMetricsView } from "./body-metrics-view";

export function ActivitiesPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "log" || tabParam === "body" ? tabParam : "dashboard";

  return (
    <div className="px-6 py-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Activities</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Track workouts, body metrics, and training consistency.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="log">Log Activity</TabsTrigger>
          <TabsTrigger value="body">Body Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <ActivitiesDashboard />
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <WorkoutLog />
        </TabsContent>

        <TabsContent value="body" className="mt-4">
          <BodyMetricsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
