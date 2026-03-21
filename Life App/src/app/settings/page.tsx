"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Dumbbell, Clock } from "lucide-react";

const SECTIONS = [
  {
    title: "Roles",
    description: "Manage the life roles you want to track",
    href: "/settings/roles",
    icon: Users,
    color: "#3B82F6",
  },
  {
    title: "Activity Types",
    description: "Configure activity types, metrics, and defaults",
    href: "/settings/activity-types",
    icon: Dumbbell,
    color: "#EF4444",
  },
  {
    title: "Scheduler",
    description: "Work hours, distribution rules, and blackout dates",
    href: "/settings/scheduler",
    icon: Clock,
    color: "#8B5CF6",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your app configuration</p>
      </div>

      <div className="grid gap-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors hover:bg-muted/20">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}15` }}
                >
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <div>
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
