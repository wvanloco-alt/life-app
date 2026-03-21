import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPlans, trainingPhases } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generatePhases } from "@/lib/training/periodization";
import { generateTennisPhases } from "@/lib/training/tennis-periodization";
import { generateRunningPhases } from "@/lib/training/running-periodization";
import { format } from "date-fns";
import type { ClimberLevel, ClimbingLimitation, Discipline, TennisPlayerLevel, TennisPlayingStyle, PhysicalLimitation, ClimbingSportProfile, TennisSportProfile, RunningSportProfile, RunnerLevel, RunningLimitation } from "@/types";
import { auth } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const planId = parseInt(id);
  if (isNaN(planId)) return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });

  const plans = await db.select().from(trainingPlans).where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)));
  if (plans.length === 0) return NextResponse.json({ error: "Training plan not found" }, { status: 404 });

  const plan = plans[0];
  const today = format(new Date(), "yyyy-MM-dd");

  await db.delete(trainingPhases).where(eq(trainingPhases.trainingPlanId, planId));

  let newPhases: { phaseType: string; orderIndex: number; durationWeeks: number; startDate: string; endDate: string; description: string; limitationNotes?: string | null }[];

  if (plan.sport === "running") {
    const profile = JSON.parse(plan.sportProfile) as RunningSportProfile;
    newPhases = generateRunningPhases(plan.playerLevel as RunnerLevel, profile.goalDistance, (profile.physicalLimitations ?? []) as RunningLimitation[], today);
  } else if (plan.sport === "tennis") {
    const profile = JSON.parse(plan.sportProfile) as TennisSportProfile;
    newPhases = generateTennisPhases(plan.playerLevel as TennisPlayerLevel, profile.playingStyle as TennisPlayingStyle, (profile.physicalLimitations ?? []) as PhysicalLimitation[], today);
  } else {
    const profile = JSON.parse(plan.sportProfile) as ClimbingSportProfile;
    newPhases = generatePhases(plan.playerLevel as ClimberLevel, profile.discipline as Discipline, (profile.physicalLimitations ?? []) as ClimbingLimitation[], today);
  }

  const insertedPhases = [];
  for (const gp of newPhases) {
    const [phase] = await db.insert(trainingPhases).values({ trainingPlanId: planId, phaseType: gp.phaseType, orderIndex: gp.orderIndex, durationWeeks: gp.durationWeeks, startDate: gp.startDate, endDate: gp.endDate, status: gp.orderIndex === 0 ? "active" : "upcoming", description: gp.description, limitationNotes: gp.limitationNotes ?? null }).returning();
    insertedPhases.push(phase);
  }

  await db.update(trainingPlans).set({ startDate: today, status: "active", updatedAt: new Date().toISOString() }).where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)));
  const [updatedPlan] = await db.select().from(trainingPlans).where(eq(trainingPlans.id, planId));

  return NextResponse.json({ ...updatedPlan, sportProfile: JSON.parse(updatedPlan.sportProfile), phases: insertedPhases });
}
