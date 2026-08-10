import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardData } from "@/types";
import { Moon, Flame, Footprints, Repeat } from "lucide-react";

type DashboardPayload = DashboardData & { garminConnected: boolean };

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function ConnectGarminHint() {
  return (
    <p className="text-sm text-muted-foreground mt-2">
      <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
        Connect Garmin
      </Link>{" "}
      to see this automatically.
    </p>
  );
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function MetricCard({ title, icon, children }: MetricCardProps) {
  return (
    <Card className="stagger-item">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function SleepCard({
  sleep,
  garminConnected,
}: {
  sleep: DashboardData["sleep"];
  garminConnected: boolean;
}) {
  const score = sleep.lastNight?.score;
  const duration = sleep.lastNight?.durationMinutes;

  return (
    <MetricCard title="Sleep" icon={<Moon className="h-4 w-4" />}>
      {!garminConnected ? (
        <ConnectGarminHint />
      ) : score != null ? (
        <>
          <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {score}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {duration ? `${formatHours(duration)} last night` : "Last night"}
            {sleep.weekAverage != null && ` · ${sleep.weekAverage} avg this week`}
          </p>
        </>
      ) : sleep.weekAverage != null ? (
        <>
          <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {sleep.weekAverage}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Weekly average — syncing soon</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Sync Garmin to see sleep scores</p>
      )}
    </MetricCard>
  );
}

export function CaloriesCard({
  calories,
  garminConnected,
}: {
  calories: DashboardData["calories"];
  garminConnected: boolean;
}) {
  const primary = calories.yesterday ?? calories.weekDailyAverage;

  return (
    <MetricCard title="Calories" icon={<Flame className="h-4 w-4" />}>
      {!garminConnected ? (
        <ConnectGarminHint />
      ) : primary != null ? (
        <>
          <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {primary.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {calories.yesterday != null ? "Yesterday" : "Weekly daily average"}
            {calories.weekDailyAverage != null &&
              calories.yesterday != null &&
              ` · ${calories.weekDailyAverage.toLocaleString()} avg/day`}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Sync Garmin to see daily calories</p>
      )}
    </MetricCard>
  );
}

export function ActivityCard({
  activities,
  garminConnected,
}: {
  activities: DashboardData["activities"];
  garminConnected: boolean;
}) {
  return (
    <MetricCard title="This week" icon={<Footprints className="h-4 w-4" />}>
      {!garminConnected ? (
        <ConnectGarminHint />
      ) : (
        <>
          <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {activities.kmRunThisWeek > 0 ? `${activities.kmRunThisWeek} km` : activities.thisWeek}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {activities.kmRunThisWeek > 0
              ? `Run · ${activities.thisWeek} activities total`
              : `${activities.thisWeek} activities logged`}
          </p>
        </>
      )}
    </MetricCard>
  );
}

export function HabitConsistencyCard({ habits }: { habits: DashboardData["habits"] }) {
  return (
    <MetricCard title="Habits" icon={<Repeat className="h-4 w-4" />}>
      {habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active habits yet.{" "}
          <Link href="/habits" className="underline underline-offset-2 hover:text-foreground">
            Add one
          </Link>
        </p>
      ) : (
        <ul className="space-y-2.5">
          {habits.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm min-w-0">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: h.color }}
                />
                <span className="truncate">{h.name}</span>
              </span>
              <span className="text-sm text-muted-foreground shrink-0 tabular-nums">
                {h.doneLast30Days} of 30
              </span>
            </li>
          ))}
        </ul>
      )}
    </MetricCard>
  );
}

export type { DashboardPayload };
