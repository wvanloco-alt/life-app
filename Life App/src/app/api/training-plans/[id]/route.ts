import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPlans, goals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isValidSplit } from "@/lib/training/split";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const planId = parseInt(id);
  if (isNaN(planId)) return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });

  const existing = await db.select().from(trainingPlans).where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Training plan not found" }, { status: 404 });

  await db.delete(trainingPlans).where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)));
  return NextResponse.json({ success: true });
}

/**
 * PATCH — Edit the training/supplemental split or preferred-day arrays on an
 * existing training plan. Used by the training plan edit dialog (Phase 4).
 *
 * Accepted body fields (all optional, only changed fields need be provided):
 *   - trainingSessionsPerWeek: number
 *   - supplementalSessionsPerWeek: number
 *   - trainingPreferredDays: number[]  (0–6)
 *   - supplementalPreferredDays: number[]
 *
 * Validation: if either split field is provided, both must be provided AND
 * training + supplemental must equal the goal's sessionsPerWeek (FR-003).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const planId = parseInt(id);
  if (isNaN(planId)) return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });

  const existing = await db.select().from(trainingPlans).where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Training plan not found" }, { status: 404 });
  const plan = existing[0];

  const body = await request.json();
  const {
    trainingSessionsPerWeek,
    supplementalSessionsPerWeek,
    trainingPreferredDays,
    supplementalPreferredDays,
  } = body;

  const updates: Record<string, unknown> = {};

  const splitProvided = trainingSessionsPerWeek != null || supplementalSessionsPerWeek != null;
  if (splitProvided) {
    if (trainingSessionsPerWeek == null || supplementalSessionsPerWeek == null) {
      return NextResponse.json({ error: "Both trainingSessionsPerWeek and supplementalSessionsPerWeek must be provided together" }, { status: 400 });
    }
    const goalRows = await db.select().from(goals).where(and(eq(goals.id, plan.goalId), eq(goals.userId, userId)));
    if (goalRows.length === 0) return NextResponse.json({ error: "Linked goal not found" }, { status: 404 });
    const goal = goalRows[0];
    if (!isValidSplit(trainingSessionsPerWeek, supplementalSessionsPerWeek, goal.sessionsPerWeek)) {
      return NextResponse.json({ error: `Split is invalid: training + supplemental must equal ${goal.sessionsPerWeek} (the goal's sessions per week)` }, { status: 400 });
    }
    updates.trainingSessionsPerWeek = trainingSessionsPerWeek;
    updates.supplementalSessionsPerWeek = supplementalSessionsPerWeek;
  }

  if (trainingPreferredDays !== undefined) {
    const days = Array.isArray(trainingPreferredDays) ? trainingPreferredDays.filter((d) => typeof d === "number") : [];
    updates.trainingPreferredDays = JSON.stringify(days);
  }
  if (supplementalPreferredDays !== undefined) {
    const days = Array.isArray(supplementalPreferredDays) ? supplementalPreferredDays.filter((d) => typeof d === "number") : [];
    updates.supplementalPreferredDays = JSON.stringify(days);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  await db.update(trainingPlans).set(updates).where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)));
  const [updated] = await db.select().from(trainingPlans).where(eq(trainingPlans.id, planId));
  return NextResponse.json({
    ...updated,
    trainingPreferredDays: updated.trainingPreferredDays ? JSON.parse(updated.trainingPreferredDays) : [],
    supplementalPreferredDays: updated.supplementalPreferredDays ? JSON.parse(updated.supplementalPreferredDays) : [],
  });
}
