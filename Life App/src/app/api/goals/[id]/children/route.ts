import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, goalRoles, roles, activityLogs, goalTallies } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { deriveQuadrant } from "@/lib/quadrants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parentId = parseInt(id);
  if (isNaN(parentId)) {
    return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });
  }

  const children = await db
    .select()
    .from(goals)
    .where(eq(goals.parentGoalId, parentId));

  const allGR = await db
    .select({
      goalId: goalRoles.goalId,
      roleId: roles.id,
      roleName: roles.name,
      roleColor: roles.color,
    })
    .from(goalRoles)
    .innerJoin(roles, eq(goalRoles.roleId, roles.id));

  const result = await Promise.all(
    children.map(async (child) => {
      const childRoles = allGR
        .filter((r) => r.goalId === child.id)
        .map((r) => ({ id: r.roleId, name: r.roleName, color: r.roleColor }));

      let current = 0;
      const target = child.targetValue ?? 0;

      if (child.month) {
        const monthDate = new Date(`${child.month}-01`);
        const from = format(startOfMonth(monthDate), "yyyy-MM-dd");
        const to = format(endOfMonth(monthDate), "yyyy-MM-dd");

        if (child.activityTypeId != null && child.targetMetric != null) {
          const logs = await db
            .select({ durationMinutes: activityLogs.durationMinutes, metrics: activityLogs.metrics })
            .from(activityLogs)
            .where(
              and(
                eq(activityLogs.goalId, child.id),
                gte(activityLogs.date, from),
                lte(activityLogs.date, to)
              )
            );

          const metric = child.targetMetric;
          if (metric === "count") {
            current += logs.length;
          } else if (metric === "duration") {
            current += logs.reduce((s, l) => s + l.durationMinutes, 0);
          } else {
            for (const log of logs) {
              try {
                const m = JSON.parse(log.metrics) as Record<string, unknown>;
                const val = m[metric];
                if (typeof val === "number") current += val;
              } catch { /* ignore */ }
            }
          }
        }

        const tallies = await db
          .select({ count: goalTallies.count })
          .from(goalTallies)
          .where(
            and(
              eq(goalTallies.goalId, child.id),
              gte(goalTallies.date, from),
              lte(goalTallies.date, to)
            )
          );
        current += tallies.reduce((s, t) => s + t.count, 0);
      }

      const percentage = target > 0
        ? Math.min(100, Math.round((current / target) * 100))
        : 0;

      return {
        ...child,
        quadrant: deriveQuadrant(child.targetDate),
        roles: childRoles,
        progress: { current, target, percentage },
      };
    })
  );

  result.sort((a, b) => (a.month ?? "").localeCompare(b.month ?? ""));

  return NextResponse.json(result);
}
