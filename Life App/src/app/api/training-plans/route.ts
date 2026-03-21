import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPlans, trainingPhases } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { assessLevel, generatePhases } from "@/lib/training/periodization";
import { assessTennisLevel, generateTennisPhases } from "@/lib/training/tennis-periodization";
import { assessRunningLevel, generateRunningPhases } from "@/lib/training/running-periodization";
import type { ClimbingSportProfile, ClimbingLimitation, TennisSportProfile, PhysicalLimitation, TennisPlayingStyle, TennisPlayerLevel, RunningSportProfile, RunnerLevel, RunningLimitation } from "@/types";
import { auth } from "@/lib/auth";

function parseSportProfile(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");
  if (!goalId) return NextResponse.json({ error: "goalId query parameter is required" }, { status: 400 });

  const plans = await db.select().from(trainingPlans).where(and(eq(trainingPlans.goalId, parseInt(goalId)), eq(trainingPlans.userId, userId)));
  if (plans.length === 0) return NextResponse.json(null);

  const plan = plans[0];
  const phases = await db.select().from(trainingPhases).where(eq(trainingPhases.trainingPlanId, plan.id));
  phases.sort((a, b) => a.orderIndex - b.orderIndex);
  return NextResponse.json({ ...plan, sportProfile: parseSportProfile(plan.sportProfile), phases });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { goalId, sport = "climbing", yearsExperience, startDate, sportProfile } = body;

  if (!goalId || yearsExperience == null || !startDate) return NextResponse.json({ error: "goalId, yearsExperience, and startDate are required" }, { status: 400 });

  const existing = await db.select().from(trainingPlans).where(and(eq(trainingPlans.goalId, goalId), eq(trainingPlans.userId, userId)));
  if (existing.length > 0) return NextResponse.json({ error: "This goal already has a training plan" }, { status: 409 });

  let derivedLevel: string;
  let recommendedModel: string;
  let generatedPhases: { phaseType: string; orderIndex: number; durationWeeks: number; startDate: string; endDate: string; description: string; limitationNotes?: string | null }[];

  if (sport === "running") {
    const profile = sportProfile as RunningSportProfile;
    if (profile?.goalDistance == null || profile?.runsPerWeek == null) return NextResponse.json({ error: "Running plans require goalDistance and runsPerWeek in sportProfile" }, { status: 400 });
    const assessment = assessRunningLevel(profile.runsPerWeek, yearsExperience, profile.canRun30MinContinuous ?? false, profile.hasRaced ?? false);
    derivedLevel = assessment.derivedLevel;
    recommendedModel = assessment.recommendedModel;
    generatedPhases = generateRunningPhases(assessment.derivedLevel as RunnerLevel, profile.goalDistance, (profile.physicalLimitations ?? []) as RunningLimitation[], startDate);
  } else if (sport === "tennis") {
    const profile = sportProfile as TennisSportProfile;
    if (!profile?.selfRating || !profile?.playingStyle) return NextResponse.json({ error: "Tennis plans require selfRating and playingStyle in sportProfile" }, { status: 400 });
    const assessment = assessTennisLevel(profile.selfRating, yearsExperience);
    derivedLevel = assessment.derivedLevel;
    recommendedModel = assessment.recommendedModel;
    generatedPhases = generateTennisPhases(assessment.derivedLevel as TennisPlayerLevel, profile.playingStyle as TennisPlayingStyle, (profile.physicalLimitations ?? []) as PhysicalLimitation[], startDate);
  } else {
    const profile = sportProfile as ClimbingSportProfile;
    if (!profile?.maxBoulderGrade || !profile?.maxSportGrade || !profile?.discipline) return NextResponse.json({ error: "Climbing plans require discipline, maxBoulderGrade, and maxSportGrade in sportProfile" }, { status: 400 });
    const assessment = assessLevel(profile.maxBoulderGrade, profile.maxSportGrade, yearsExperience);
    derivedLevel = assessment.derivedLevel;
    recommendedModel = assessment.recommendedModel;
    generatedPhases = generatePhases(derivedLevel as any, profile.discipline, (profile.physicalLimitations ?? []) as ClimbingLimitation[], startDate);
  }

  const [plan] = await db.insert(trainingPlans).values({ goalId, sport, periodizationModel: recommendedModel, playerLevel: derivedLevel, yearsExperience, sportProfile: JSON.stringify(sportProfile), startDate, status: "active", userId }).returning();

  const insertedPhases = [];
  for (const gp of generatedPhases) {
    const [phase] = await db.insert(trainingPhases).values({ trainingPlanId: plan.id, phaseType: gp.phaseType, orderIndex: gp.orderIndex, durationWeeks: gp.durationWeeks, startDate: gp.startDate, endDate: gp.endDate, status: gp.orderIndex === 0 ? "active" : "upcoming", description: gp.description, limitationNotes: gp.limitationNotes ?? null }).returning();
    insertedPhases.push(phase);
  }

  return NextResponse.json({ ...plan, sportProfile: parseSportProfile(plan.sportProfile), phases: insertedPhases }, { status: 201 });
}
